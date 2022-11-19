#!/usr/bin/env zx
import { $, argv, echo } from "zx"
import { networkInterfaces } from "node:os"

$.silent = true

/**
 * This is intended to be used with `task dev:dns` of this project.
 * The IP address returned is used for resolving DNS requests to that IP address.
 *
 * Currently IPv4 addresses are preferred but this could be changed if needed.
 *
 * @param {string} startsWith Portion of requested IP address
 * @returns Requested IP address
 */
export function ipAddressForCoreDns(startsWith = "") {
	const networks = networkInterfaces()
	const external = Object.values(networks)
		.flat()
		.filter(n => !n.internal)
	if (!startsWith) {
		const firstIpv4 = external.find(n => n.family === "IPv4")
		if (firstIpv4) {
			return firstIpv4?.address ?? ""
		}
		const firstAnyFamily = external[0]?.address ?? ""
		return firstAnyFamily
	}
	return external.find(n => n.address.startsWith(startsWith))?.address ?? ""
}

if (argv.help || argv.h) {
	echo`Pass \`--begin\` flag with beginning of an IP address to echo the first found IP address from network interfaces.`
	process.exit(0)
}
const startsWith = String(argv.begin ?? "")
echo(ipAddressForCoreDns(startsWith))
