
'use server';

import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { randomBytes } from 'crypto';
import clientPromise from './mongodb';
import { canUser, getCurrentUser, isUserAdmin, Permission, PermissionLevel } from './auth';
import nodemailer from 'nodemailer';
import { decrypt } from './server-helpers';
import { revalidatePath } from 'next/cache';
import { createNotification } from './actions';
import type { Server } from './types';


const InvitationSchema = z.object({
  serverId: z.instanceof(ObjectId),
  ownerId: z.instanceof(ObjectId),
  email: z.string().email(),
  permission: z.nativeEnum(Permission),
  token: z.string(),
  status: z.enum(['pending', 'accepted', 'declined', 'revoked']),
  expiresAt: z.date(),
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
    permission: z.nativeEnum(Permission),
});

export async function inviteUserToServer(prevState: any, formData: FormData) {
    const owner = await getCurrentUser();
    if (!owner) return { error: "You must be logged in." };

    const validated = InviteUserSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!validated.success) {
        return { error: "Invalid data provided." };
    }

    const { serverId, serverName, email, permission } = validated.data;
    if (permission === Permission.ADMIN) {
        return { error: "Cannot grant Admin permission through an invitation." };
    }

    const server = await clientPromise.then(c => c.db().collection('servers').findOne({ _id: new ObjectId(serverId) })) as Server | null;
    if (!server) return { error: "Server not found." };
    
    if (server.ownerId.toString() !== owner._id) {
        return { error: "You do not have permission to share this server." };
    }
    
    if (owner.email === email) {
        return { error: "You cannot invite yourself." };
    }
    
    const db = (await clientPromise).db();

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

    const invitation: Invitation = {
        serverId: new ObjectId(serverId),
        ownerId: new ObjectId(owner._id),
        email,
        permission,
        token,
        status: 'pending',
        expiresAt,
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

export async function getInvitationByToken(token: string): Promise<InvitationWithDetails | null> {
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

export async function handleInvitation(token: string, action: 'accept' | 'decline') {
    const user = await getCurrentUser();
    if (!user) return { error: "You must be logged in to respond to an invitation." };

    const db = (await clientPromise).db();
    const invitation = await db.collection('invitations').findOne({ token, status: 'pending', expiresAt: { $gt: new Date() } });

    if (!invitation) return { error: "This invitation is invalid or has expired." };
    if (invitation.email !== user.email) return { error: "This invitation is for a different user." };
    if (invitation.ownerId.toString() === user._id) return { error: "You cannot accept an invitation you sent." };

    if (action === 'decline') {
        await db.collection('invitations').updateOne({ _id: invitation._id }, { $set: { status: 'declined', recipientId: new ObjectId(user._id) } });
        return { success: true, message: "You have declined the invitation." };
    }

    // Accept
    const result = await db.collection('invitations').findOneAndUpdate(
        { _id: invitation._id },
        { $set: { status: 'accepted', recipientId: new ObjectId(user._id) } },
        { returnDocument: 'after' }
    );
    
    if (result) {
        await createNotification(invitation.ownerId.toString(), `${user.email} has accepted your invitation to access a server.`, 'server_shared');
        revalidatePath('/dashboard/guests');
        revalidatePath('/dashboard');
        return { success: true, serverId: invitation.serverId.toString() };
    } else {
        return { error: 'Failed to accept invitation.' };
    }
}

export async function getSentInvitations() {
    const user = await getCurrentUser();
    if (!user) return [];

    const db = (await clientPromise).db();
    const invitations = await db.collection('invitations').aggregate([
        { $match: { ownerId: new ObjectId(user._id) } },
        { $sort: { expiresAt: -1 } },
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
                email: 1,
                permission: 1,
                status: 1,
                expiresAt: 1,
                'server.name': '$serverInfo.name'
            }
        }
    ]).toArray();
    
    return JSON.parse(JSON.stringify(invitations));
}

export async function getReceivedInvitations() {
    const user = await getCurrentUser();
    if (!user) return [];

    const db = (await clientPromise).db();
    const invitations = await db.collection('invitations').aggregate([
        { $match: { email: user.email, status: 'pending', expiresAt: { $gt: new Date() } } },
        { $sort: { expiresAt: -1 } },
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
    return invitations;
}

export async function revokeInvitation(invitationId: string) {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized" };

    if (!ObjectId.isValid(invitationId)) return { error: "Invalid ID" };

    const db = (await clientPromise).db();
    const result = await db.collection('invitations').deleteOne({
        _id: new ObjectId(invitationId),
        ownerId: new ObjectId(user._id) // Ensure only owner can revoke
    });

    if (result.deletedCount === 0) {
        return { error: "Invitation not found or you do not have permission to revoke it." };
    }

    revalidatePath('/dashboard/guests');
    revalidatePath('/dashboard');
    
    return { success: true };
}
