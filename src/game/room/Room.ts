import { RoomModel } from "./Room.model";
import { RoomEngine } from "./Room.engine.old";

export default class Room {
  engine: RoomEngine

  constructor (
    public model: RoomModel
  ) {
    //this.engine = new RoomEngine(this)
  }

  dispose () {
    
  }
}