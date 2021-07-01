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

// NOTE: below is useful only if install is ran on host and not in container
/* if (process.env.NODE_ENV === "development") {
  echo`Currently in development mode. Running background tasks ...`
  const watcher = chokidar.watch(['./package.json', 'yarn.lock'], { persistent: true })
  let installing = false
  watcher.on('change', async (path, _stats) => {
    echo`File changed: ${path}`
    if (!installing) {
      installing = true
      echo`Checking dependencies ...`
      // REFERENCE: https://gist.github.com/armand1m/b8061bcc9e8e9a5c1303854290c7d61e
      await $`(yarn check --integrity && yarn check --verify-tree) || yarn --pure-lockfile`
      installing = false
    }
  })
} */

if (process.env.NODE_ENV !== "production") {
  echo`Running in ${process.env.NODE_ENV} mode. Building in background ...`
  $`yarn build`
}

const args = process.argv.slice(3).join(" ")
echo`Starting app ...`
$`yarn ${args || "start"}`
