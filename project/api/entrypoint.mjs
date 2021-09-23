#!/usr/bin/env zx
$.verbose = false

/** Add color to console logs then echo. */
function echo(strings, ...vals) {
  let str = strings[0]
  for (let i = 0; i < vals.length; i++) { str += chalk`{green ${vals[i]}}` + strings[i + 1]; }
  console.log(chalk`{green.bold [ ${prefix} ]}`, str)
}

let prefix = "project"
try {
  prefix = JSON.parse(await $`cat package.json`)?.name ?? prefix
} catch (error) { echo`Could not gather project name from package.json` }

$.verbose = true
const mode = process.env.NODE_ENV || "production"
if (mode !== "production") {
  echo`Running in ${mode} mode. Building in background ...`
  $`yarn dev`
}

const args = process.argv.slice(3).join(" ")
echo`Starting app in ${mode} mode ...`
await $`yarn ${args || (mode === "production" ? "start" : "restart")}`
