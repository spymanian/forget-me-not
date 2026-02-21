export type CapsuleFile = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  dataBase64: string;
};

export type CapsulePayload = {
  note: string;
  files: CapsuleFile[];
};

export type MoodTag = {
  mood: string;
  color: string;
};
