var MongoClient = require( 'mongodb' ).MongoClient;;

var _db:any

let Client = {
  connectToServer: (callback: Function) => {
    MongoClient.connect("mongodb://localhost:27017/machinomy", (err:any, db:any) => {
      _db = db
      if (err) {
        throw new Error("Can not connect to the database")
      }
      return callback()
    })
  },

  db: () => {
    return _db
  }
}

export default Client
