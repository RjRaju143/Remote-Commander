
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
import { Mail, Phone } from "lucide-react";
import Link from "next/link";

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

        <Card>
          <CardHeader>
            <CardTitle>Contact Us</CardTitle>
            <CardDescription>
              Can't find an answer? Reach out to us directly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
             <div className="text-sm text-muted-foreground pt-4">
                Our support team is available Monday to Friday, 9 AM to 5 PM IST. We typically respond to emails within 24 hours.
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
