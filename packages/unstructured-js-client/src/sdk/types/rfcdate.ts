/*
 * Code generated by Speakeasy (https://speakeasyapi.dev). DO NOT EDIT.
 */

export class RFCDate {
  // @ts-ignore
  private date: Date;

  constructor(date: Date | { date: string } | string | undefined) {
    if (!date) {
      this.date = new Date();
      return;
    }

    if (typeof date === "string") {
      this.date = new Date(date);
      return;
    }
    if (date instanceof Date) {
      this.date = date as Date;
      return;
    }

    const anyDate = date as any;
    if (date && !!anyDate.date) {
      this.date = new Date(anyDate.date);
    }
  }

  public getDate(): Date {
    return this.date;
  }

  public toJSON(): string {
    return this.toString();
  }

  public toString(): string {
    const dateRegex = /^(\d{4})-(\d{2})-(\d{2})/;

    const matches = this.date.toISOString().match(dateRegex);
    if (matches == null) {
      throw new Error("Date format is not valid");
    }

    const [, year, month, day]: RegExpMatchArray = matches;
    return `${year}-${month}-${day}`;
  }
}
