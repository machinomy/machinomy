# Machinomy Logger

[Machinomy](https://github.com/machinomy/machinomy/tree/master/packages/machinomy) logger. Works in browser and Node.

### Basic usage

```typescript
import Logger from '@machinomy/logger'

const LOG = new Logger('your-namespace')

LOG.info('This is info message')
LOG.warn('This is warn message')
LOG.error('This is error message')
LOG.fatal('This is fatal message')
LOG.debug('This is debug message')
LOG.trace('This is trace message')
```

### Usage with LogDNA

```typescript
import Logger from '@machinomy/logger'

const LOG = new Logger(
    'your-namespace',
    'LogDNA-Ingestion-Key-As-String',    // Ingestion Key from "API Keys" section of LogDNA website
    { hostname: 'another-host' }         // Any LogDNA for Node.js constructor options
 )

LOG.info('This is info message')
LOG.warn('This is warn message')
LOG.error('This is error message')
LOG.fatal('This is fatal message')
LOG.debug('This is debug message')
LOG.trace('This is trace message')
```

For more LogDNA options see [LogDNA for Node.js](https://github.com/logdna/nodejs#options)


Web site: [machinomy.com](http://machinomy.com).
Twitter: [@machinomy](http://twitter.com/machinomy).
Support/Discussion: [Gitter](https://gitter.im/machinomy/machinomy).

:exclamation:
Please, pay attention, this package is the part of [Machinomy Lerna Monorepo](https://github.com/machinomy/machinomy) and it's intended to use with other monorepo's packages. 

:no_entry: You **should not** git clone this repository alone

:white_check_mark: You **should** git clone the main repository via
```
git clone https://github.com/machinomy/machinomy.git
or 
git clone git@github.com:machinomy/machinomy.git
```

**For documentation, usage and contributing please see [Machinomy Monorepo](https://github.com/machinomy/machinomy).**
