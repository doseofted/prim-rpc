#!/usr/bin/env zx
import { $, argv, echo } from "zx"
import { networkInterfaces } from "node:os"

$.silent = true

/**
 * This is intended to be used with `task dev:dns` of this project.
 * The IP address returned is used for resolving DNS requests to that IP address.
 *
 * @param {string} startsWith Portion of requested IP address
 * @returns Requested IP address
 */
export function ipAddressForCoreDns(startsWith = "") {
	const networks = networkInterfaces()
	delete networks.lo
	if (!startsWith) {
		Object.values(networks).flat()[0]?.address ?? ""
	}
	return Object.values(networks).flat().find(n => n.address.startsWith(startsWith))?.address ?? ""
}

if (argv.help || argv.h) {
	echo`Pass \`--begin\` flag with beginning of an IP address to echo the first found IP address from network interfaces.`
	process.exit(0)
}
const startsWith = String(argv.begin ?? "")
echo(ipAddressForCoreDns(startsWith))
