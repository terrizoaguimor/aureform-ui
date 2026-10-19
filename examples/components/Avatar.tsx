"use client";

import { Avatar } from "@/components/ui/avatar";

export default function AvatarExample() {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="flex items-center gap-3">
        <Avatar
          name="Alex Morgan"
          src="/assets/avatars/alex-morgan.svg"
          size="sm"
        />
        <span className="text-sm">Alex Morgan</span>
      </div>
      <div className="flex items-center gap-3">
        <Avatar name="Isabel Torres" size="sm" />
        <span className="text-sm">Isabel Torres · initials fallback</span>
      </div>
    </div>
  );
}
