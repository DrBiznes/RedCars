export class Edge {
  constructor(
    public from: string,
    public to: string,
    public distance: number,
    public time: number,
    public lineNames: string[],
    public isTransfer: boolean = false,
    public isWalking: boolean = false
  ) {}
}