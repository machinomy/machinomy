#!/usr/bin/env node

import * as yargs from 'yargs'
import Wraptso from '../index'

let args = yargs
  .option('output', {
    describe: 'Folder for generated files',
    alias: 'o'
  })
  .argv

let pattern = args._[0]
let outputDir = args['output'] // path.resolve(__dirname, '..', '..', 'src', 'wrappers')

let wraptso = new Wraptso(pattern, outputDir)
wraptso.run().then(() => {
  // Do Nothing
}).catch(error => {
  console.error(error)
  process.exit(1)
})
