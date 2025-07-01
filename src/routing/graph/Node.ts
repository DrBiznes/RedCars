import { Station } from '../types/routing.types';

export class Node {
  constructor(
    public station: Station,
    public distance: number = Infinity,
    public previous: Node | null = null,
    public visited: boolean = false
  ) {}

  reset(): void {
    this.distance = Infinity;
    this.previous = null;
    this.visited = false;
  }
}