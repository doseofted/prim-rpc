#!/usr/bin/env zx

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
  prefix = (JSON.parse(await $`cat package.json`) || {}).name || prefix
} catch (error) {
  echo`Could not gather project name from package.json`
}

echo`Starting app ...`
$`yarn start`
