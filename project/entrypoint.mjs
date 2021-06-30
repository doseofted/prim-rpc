#!/usr/bin/env zx

// import * as chokidar from "chokidar"

/** Add color to console logs then echo. */
function echo(strings, ...values) {
  let str = strings[0]
  for (let i = 0; i < values.length; i++) {
    str += chalk`{green ${values[i]}}` + strings[i+1];
  }
  return console.log(chalk`{green.bold [ ${prefix} ]}`, str)
}

let prefix = "project"
try {
  prefix = JSON.parse(await $`cat package.json`)?.name ?? prefix
} catch (error) {
  echo`Could not gather project name from package.json`
}

// if (process.env.NODE_ENV === "development") {
//   const watcher = chokidar.watch('./node_modules')
//   watcher.on('change', (path, stats) => {
//     echo`File changed: ${path}`
//     $`(yarn check --integrity && yarn check --verify-tree) || yarn --pure-lockfile`
//   });
// }

// echo`Checking dependencies ...`
// REFERENCE: https://gist.github.com/armand1m/b8061bcc9e8e9a5c1303854290c7d61e
// await $`(yarn check --integrity && yarn check --verify-tree) || yarn --pure-lockfile`

const args = process.argv.slice(3)
echo`Starting app ...`
$`yarn ${args.length > 0 ? args.join(" ") : "start"}`
