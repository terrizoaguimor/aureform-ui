"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

export default function CardExample() {
  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>A little clarity.</CardTitle>
        <CardDescription>
          A considered space for your next good idea.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">
          Bring your project notes, decisions and next steps together.
        </p>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          Example project · Studio
        </p>
      </CardFooter>
    </Card>
  );
}
