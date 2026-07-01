import { supabase } from "@/integrations/supabase/client";

const url = (path: string) =>
  supabase.storage.from("marketing-media").getPublicUrl(path).data.publicUrl;

export const heroSummer = {
  webm: url("hero-summer.webm"),
  mp4: url("hero-summer.mp4"),
  poster: url("hero-summer-poster.jpg"),
};
