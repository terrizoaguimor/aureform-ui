// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=25-638
// source=src/components/ui/video-player.tsx
// component=VideoPlayer
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Paused": "Paused", "Playing": "Playing", "Unavailable": "Unavailable"});
const imports = [...new Set([...["import { VideoPlayer } from \"@/components/ui/video-player\";"], ...nestedImports])];
export default {
  example: figma.code`<VideoPlayer src="/assets/aureform-motion.webm" poster="/assets/art/arc.svg" captionSrc="/assets/aureform-motion.vtt" label="Aureform product introduction" />`,
  id: "aureform-video-player",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "VideoPlayer", "node": "25:638", "source": "src/components/ui/video-player.tsx", "sourceExport": "VideoPlayer", "axes": {"State": ["Paused", "Playing", "Unavailable"]}, "mappedProperties": [], "intentionalVisualOnly": [{"property": "State", "values": ["Paused", "Playing", "Unavailable"], "reason": "Playback and failure are internal browser-media state; no playing/unavailable prop exists."}], "notes": [], "imports": imports, "nativePropertyValues": { "State": state }} },
};
