
'use server';

import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { randomBytes } from 'crypto';
import clientPromise from './mongodb';
import { createNotification, getCurrentUser } from './actions';
import nodemailer from 'nodemailer';
import { decrypt } from './server-helpers';
import { revalidatePath } from 'next/cache';
import type { Server } from './types';
import { Permission } from './types';


const InvitationSchema = z.object({
  serverId: z.instanceof(ObjectId),
  ownerId: z.instanceof(ObjectId),
  email: z.string().email(),
  permission: z.enum([Permission.READ, Permission.EXECUTE, Permission.ADMIN, Permission.NONE]),
  token: z.string(),
  status: z.enum(['pending', 'accepted', 'declined', 'revoked']),
  expiresAt: z.date(),
  createdAt: z.date(),
  recipientId: z.instanceof(ObjectId).optional(),
});

type Invitation = z.infer<typeof InvitationSchema>;

export type InvitationWithDetails = Invitation & {
    _id: ObjectId;
    server: { name: string };
    owner: { email: string };
};


const InviteUserSchema = z.object({
    serverId: z.string().refine(id => ObjectId.isValid(id)),
    serverName: z.string(),
    email: z.string().email(),
    permission: z.enum([Permission.READ, Permission.EXECUTE]),
});

export async function inviteUserToServer(prevState: any, formData: FormData) {
    const owner = await getCurrentUser();
    if (!owner) return { error: "You must be logged in." };

    const rawFormData = Object.fromEntries(formData.entries());
    
    const validated = InviteUserSchema.safeParse(rawFormData);
    if (!validated.success) {
        return { error: "Invalid data provided." };
    }

    const { serverId, serverName, email, permission } = validated.data;
    const db = (await clientPromise).db();

    // 1. Check if user exists
    const guestUser = await db.collection('users').findOne({ email });
    if (!guestUser) {
        return { error: `User with email "${email}" not found.` };
    }
    
    const server = await db.collection('servers').findOne({ _id: new ObjectId(serverId) }) as Server | null;
    if (!server) return { error: "Server not found." };
    
    if (server.ownerId.toString() !== owner._id) {
        return { error: "You do not have permission to share this server." };
    }
    
    if (owner.email === email) {
        return { error: "You cannot invite yourself." };
    }
    
    // Check if there's already a pending or accepted invitation for this user and server
    const existingInvitation = await db.collection('invitations').findOne({
        serverId: new ObjectId(serverId),
        email,
        status: { $in: ['pending', 'accepted'] }
    });

    if (existingInvitation) {
        return { error: `An active or pending invitation already exists for this user and server.` };
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const invitation: Omit<Invitation, 'status'> & { status: 'pending' } = {
        serverId: new ObjectId(serverId),
        ownerId: new ObjectId(owner._id),
        email,
        permission,
        token,
        status: 'pending',
        expiresAt,
        createdAt: new Date(),
    };

    const validatedInvitation = InvitationSchema.safeParse(invitation);
    if (!validatedInvitation.success) {
        console.error("Invitation validation error:", validatedInvitation.error);
        return { error: 'Internal error creating invitation.' };
    }

    await db.collection('invitations').insertOne(validatedInvitation.data);
    
    try {
        await sendInvitationEmail(email, owner.email!, serverName, token);
    } catch(e: any) {
        // If email fails, delete the invitation to allow retrying
        await db.collection('invitations').deleteOne({ token });
        return { error: `Could not send invitation email. ${e.message}` };
    }

    await createNotification(owner._id, `You invited ${email} to access "${serverName}".`, 'server_shared');
    revalidatePath('/dashboard/guests');

    return { success: true, message: `An invitation has been sent to ${email}.` };
}

async function sendInvitationEmail(recipientEmail: string, ownerEmail: string, serverName: string, token: string) {
    const dbClient = await clientPromise;
    const db = dbClient.db();
    const smtpSettings = await db.collection('settings').findOne({ key: 'smtp' });

    let transporter;
    if (smtpSettings) {
        transporter = nodemailer.createTransport({
            host: smtpSettings.host,
            port: Number(smtpSettings.port),
            secure: Number(smtpSettings.port) === 465,
            auth: { user: smtpSettings.user, pass: decrypt(smtpSettings.pass) },
        });
    } else {
        const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
        if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
            throw new Error("SMTP service is not configured.");
        }
        transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: Number(SMTP_PORT),
            secure: Number(SMTP_PORT) === 465,
            auth: { user: SMTP_USER, pass: SMTP_PASS },
        });
    }
    
    const senderUser = smtpSettings?.user || process.env.SMTP_USER;
    const invitationUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/invitation?token=${token}`;
    
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <body>
        <h2>You've been invited to Remote Commander</h2>
        <p>${ownerEmail} has invited you to access the server "${serverName}".</p>
        <p>To accept this invitation, please click the link below. This link is valid for 24 hours.</p>
        <a href="${invitationUrl}" style="background-color: #1a73e8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Accept Invitation</a>
        <p>If you were not expecting this invitation, you can safely ignore this email.</p>
    </body>
    </html>`;

    await transporter.sendMail({
        from: `"Remote Commander" <${senderUser}>`,
        to: recipientEmail,
        subject: `Invitation to access ${serverName} on Remote Commander`,
        html: emailHtml,
    });
}

export async function getSentInvitations() {
    const user = await getCurrentUser();
    if (!user) return [];

    const db = (await clientPromise).db();
    const invitations = await db.collection('invitations').aggregate([
        { $match: { ownerId: new ObjectId(user._id) } },
        { $sort: { createdAt: -1 } },
        {
            $lookup: {
                from: 'servers',
                localField: 'serverId',
                foreignField: '_id',
                as: 'serverInfo'
            }
        },
        { $unwind: '$serverInfo' },
        {
            $project: {
                _id: 1,
                email: 1,
                permission: 1,
                status: 1,
                createdAt: 1,
                'server.name': '$serverInfo.name'
            }
        }
    ]).toArray();
    
    return invitations;
}

export async function getReceivedInvitations() {
    const user = await getCurrentUser();
    if (!user) return [];

    const db = (await clientPromise).db();
    const invitations = await db.collection('invitations').aggregate([
        { $match: { email: user.email, status: 'pending', expiresAt: { $gt: new Date() } } },
        { $sort: { createdAt: -1 } },
        {
            $lookup: {
                from: 'servers',
                localField: 'serverId',
                foreignField: '_id',
                as: 'serverInfo'
            }
        },
        { $unwind: '$serverInfo' },
        {
            $lookup: {
                from: 'users',
                localField: 'ownerId',
                foreignField: '_id',
                as: 'ownerInfo'
            }
        },
        { $unwind: '$ownerInfo' },
        {
            $project: {
                token: 1,
                permission: 1,
                'server.name': '$serverInfo.name',
                'owner.email': '$ownerInfo.email'
            }
        }
    ]).toArray();

    return JSON.parse(JSON.stringify(invitations));
}

export async function getInvitationsForUser(userId: string) {
    const db = (await clientPromise).db();
    const invitations = await db.collection('invitations').find({
        recipientId: new ObjectId(userId),
        status: 'accepted'
    }).toArray();
    return JSON.parse(JSON.stringify(invitations));
}

export async function revokeInvitation(invitationId: string) {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized" };

    if (!ObjectId.isValid(invitationId)) return { error: "Invalid ID" };

    const db = (await clientPromise).db();
    
    const invitation = await db.collection('invitations').findOne({ _id: new ObjectId(invitationId) });
    if (!invitation) return { error: "Invitation not found." };
    if (invitation.ownerId.toString() !== user._id) return { error: "You do not have permission to revoke this invitation." };

    const result = await db.collection('invitations').updateOne(
      { _id: new ObjectId(invitationId) },
      { $set: { status: 'revoked' } }
    );

    if (result.modifiedCount === 0) {
        return { error: "Failed to revoke the invitation." };
    }

    // Notify the guest if they had already accepted
    if (invitation.status === 'accepted' && invitation.recipientId) {
        const server = await db.collection('servers').findOne({ _id: invitation.serverId });
        await createNotification(invitation.recipientId.toString(), `Your access to server "${server?.name}" has been revoked by the owner.`, 'server_shared');
    }

    revalidatePath('/dashboard/guests');
    return { success: true };
}


export async function getInvitationByToken(token: string): Promise<any | null> {
    const db = (await clientPromise).db();
    const invitation = await db.collection('invitations').findOne({ token, status: 'pending', expiresAt: { $gt: new Date() } });

    if (!invitation) return null;

    const [server, owner] = await Promise.all([
        db.collection('servers').findOne({ _id: invitation.serverId }),
        db.collection('users').findOne({ _id: invitation.ownerId }),
    ]);

    if (!server || !owner) return null;

    const plainInvite = JSON.parse(JSON.stringify(invitation));
    plainInvite.server = { name: server.name };
    plainInvite.owner = { email: owner.email };
    return plainInvite;
}


const UpdatePermissionSchema = z.object({
    invitationId: z.string().refine(id => ObjectId.isValid(id)),
    permission: z.enum([Permission.READ, Permission.EXECUTE]),
});

export async function updateInvitationPermission(prevState: any, formData: FormData) {
    const owner = await getCurrentUser();
    if (!owner) return { error: "You must be logged in." };

    const rawFormData = Object.fromEntries(formData.entries());
    const validated = UpdatePermissionSchema.safeParse(rawFormData);

    if (!validated.success) {
        return { error: "Invalid data provided." };
    }

    const { invitationId, permission } = validated.data;
    const db = (await clientPromise).db();

    const invitation = await db.collection('invitations').findOne({
        _id: new ObjectId(invitationId),
        ownerId: new ObjectId(owner._id)
    });

    if (!invitation) {
        return { error: "Invitation not found or you don't have permission to edit it." };
    }

    const result = await db.collection('invitations').updateOne(
        { _id: new ObjectId(invitationId) },
        { $set: { permission: permission } }
    );
    
    if (result.modifiedCount === 0) {
        return { error: "Failed to update permission. The permission might be the same as before." };
    }

    // Notify the guest user if they have already accepted the invitation
    if (invitation.recipientId && invitation.status === 'accepted') {
        const server = await db.collection('servers').findOne({ _id: invitation.serverId });
        await createNotification(
            invitation.recipientId.toString(),
            `Your permission for server "${server?.name}" has been updated to "${permission}" by the owner.`,
            'server_shared'
        );
    }
    
    revalidatePath('/dashboard/guests');
    return { success: true };
}

    