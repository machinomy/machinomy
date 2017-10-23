const MongoClient = require( 'mongodb' ).MongoClient

let _db: any

let Client = {
  connectToServer: (name: string = 'machinomy'): Promise <void> => {
    return new Promise((resolve, reject) => {
      MongoClient.connect('mongodb://localhost:27017/' + name, (err: any, db: any) => {
        _db = db
        if (err) {
          reject(Error('Can not connect to the database'))
        }
        resolve()
      })
    })
  },

  db: () => {
    return _db
  }
}

export default Client
