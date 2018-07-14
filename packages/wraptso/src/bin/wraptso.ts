#!/usr/bin/env node

import * as yargs from 'yargs'
import * as path from 'path'
import Wraptso from '../index'

let args = yargs
  .option('output', {
    describe: 'Folder for generated files',
    alias: 'o'
  })
  .argv

let pattern = args._[0]
let templatesDir = path.resolve(__dirname, 'templates')
let outputDir = args['output'] // path.resolve(__dirname, '..', '..', 'src', 'wrappers')

let wraptso = new Wraptso(pattern, templatesDir, outputDir)
wraptso.run().then(() => {
  // Do Nothing
}).catch(error => {
  console.error(error)
  process.exit(1)
})
