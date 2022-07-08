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
	const interfaces = Object.keys(networks)
	if (interfaces.length === 1) {
		const network = networks[interfaces[0]]
		const foundIpv4 = network.find(n => n.family === "IPv4")
		const foundIpv6 = network.find(n => n.family === "IPv6")
		return (foundIpv4 ?? foundIpv6)?.address
	}
	if (!startsWith) {
		Object.values(networks).flat()[0]?.address ?? ""
	}
	return Object.values(networks).flat().find(n => n.address.startsWith(startsWith))?.address ?? ""
}

const startsWith = String(argv.begin ?? "")
echo(ipAddressForCoreDns(startsWith))
