import { AlignmentType, HeadingLevel, IRunOptions, IParagraphOptions } from "docx"

export const docStyles = {
  title: {
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  } as IParagraphOptions,

  heading1: {
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
  } as IParagraphOptions,

  heading2: {
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 100 },
  } as IParagraphOptions,

  normal: {
    spacing: { after: 100 },
  } as IParagraphOptions,

  label: {
    bold: true,
    size: 20,
    color: "666666",
  } as IRunOptions,

  value: {
    size: 22,
  } as IRunOptions,

  bold: {
    bold: true,
    size: 22,
  } as IRunOptions,
}
