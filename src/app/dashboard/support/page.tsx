
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Mail, Phone, Loader2, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useActionState, useEffect } from "react";
import { handleSupportRequest } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";

const faqs = [
  {
    question: "How do I add a new server?",
    answer:
      "Navigate to the Servers page and click the 'Add Server' button. You will need the server's IP address, username, and private key.",
  },
  {
    question: "What is the AI Command Generator?",
    answer:
      "The AI Command Generator helps you find the right terminal command for a specific task. Just describe what you want to do in plain English, and the AI will suggest a command.",
  },
  {
    question: "Is my private key stored securely?",
    answer:
      "Yes, all sensitive information, including private keys, is encrypted before being stored in our database to ensure maximum security.",
  },
   {
    question: "How do I share server access with a guest?",
    answer:
      "On the Servers page, click the three-dot menu on the server you wish to share and select 'Share'. Enter the guest's email address. The guest must have an account on Remote Commander.",
  },
];


function SupportForm() {
  const { toast, notify } = useToast();
  const [state, formAction, pending] = useActionState(handleSupportRequest, undefined);

  useEffect(() => {
    if (state?.error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: state.error,
      });
    }
    if (state?.success) {
      toast({
        title: "Message Sent!",
        description: "Thank you for contacting us. We'll get back to you shortly.",
      });
      if (state.notification) {
          notify();
      }
      const form = document.getElementById('supportForm') as HTMLFormElement;
      form?.reset();
    }
  }, [state, toast, notify]);

  return (
    <Card>
        <CardHeader>
        <CardTitle>Send us a Message</CardTitle>
        <CardDescription>
            Have a question or issue? Fill out the form below.
        </CardDescription>
        </CardHeader>
        <form action={formAction} id="supportForm">
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" name="name" required placeholder="Your Name" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" name="email" type="email" required placeholder="your.email@example.com" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea id="message" name="message" required placeholder="Describe your issue or question..." />
                </div>
                 {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
                <Button type="submit" disabled={pending}>
                    {pending ? <Loader2 className="animate-spin" /> : <Send />}
                    Send Message
                </Button>
            </CardContent>
        </form>
    </Card>
  )
}

export default function SupportPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Support Center</h1>
        <p className="text-muted-foreground">
          Find answers to common questions or get in touch with our team.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <SupportForm />
        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
            <CardDescription>
              Browse through our most common questions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger>{faq.question}</AccordionTrigger>
                  <AccordionContent>{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>

       <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>
              You can also reach out to us directly through these channels.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
             <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
                <Mail className="size-6 text-primary" />
                <div>
                    <h3 className="font-semibold">Email Support</h3>
                    <p className="text-sm text-muted-foreground">
                        <a href="mailto:bangarraju1152@gmail.com" className="hover:underline">
                            bangarraju1152@gmail.com
                        </a>
                    </p>
                </div>
             </div>
             <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
                <Phone className="size-6 text-primary" />
                <div>
                    <h3 className="font-semibold">Phone Support</h3>
                    <p className="text-sm text-muted-foreground">
                        +91 7702481430.
                    </p>
                </div>
             </div>
             <div className="text-sm text-muted-foreground pt-4 col-span-full">
                Our support team is available Monday to Friday, 9 AM to 5 PM IST. We typically respond to emails within 24 hours.
             </div>
          </CardContent>
        </Card>
    </div>
  );
}
