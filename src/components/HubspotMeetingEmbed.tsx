"use client";

import React, { useEffect, useRef } from "react";

type Props = {
  url?: string;
};

export default function HubspotMeetingEmbed({ url = "https://meetings-na2.hubspot.com/owais-n-a?embed=true" }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const src = "https://static.hsappstatic.net/MeetingsEmbed/ex/MeetingsEmbedCode.js";
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (!existing) {
      const s = document.createElement("script");
      s.type = "text/javascript";
      s.async = true;
      s.src = src;
      document.body.appendChild(s);
    } else {
      // If script already present, trigger reprocessing of containers if supported
      try {
        // @ts-ignore
        if (window.HubSpotConversations && window.HubSpotConversations.widget) {
          // no-op
        }
      } catch {}
    }
  }, []);

  return (
    <div>
      <div
        ref={containerRef}
        className="meetings-iframe-container"
        data-src={url}
        style={{ minHeight: 600 }}
      />
    </div>
  );
}

