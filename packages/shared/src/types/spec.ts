export const SpecFormat = {
  MARKDOWN: 'MARKDOWN',
  CLAUDE_CODE: 'CLAUDE_CODE',
  LINEAR: 'LINEAR',
} as const;
export type SpecFormat = (typeof SpecFormat)[keyof typeof SpecFormat];

export interface Spec {
  id: string;
  projectId: string;
  title: string;
  content: string;
  format: SpecFormat;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
