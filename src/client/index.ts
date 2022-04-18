/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-shadow */
/* eslint-disable indent */
import { fetch } from "cross-fetch"
import { Obj, trimRight } from "@agyemanjp/standard"
import {
	Json,
	RequestArgs, RequestPUT, RequestPOST, RequestPATCH, RequestDELETE, RequestGET,
	MIME_TYPES,
	JsonArray
} from "../types"

export const request = { any: any, get, put, post, patch, delete: del }

export function post<A extends AcceptType = AcceptType>(args: Specific<RequestPOST, A>): Promise<TResponse<A>>
export function post<Out extends Json = Json>(args: Specific<RequestPOST, "Json">): Promise<Out>
export function post(args: Specific<RequestPOST>) {
	return __({ ...args, method: "POST" }) as any
}
// const p = post<{ arr: any[] }>({ url: "", body: { a: "" }, accept: "Json" }).then(y => y)

export function put<A extends AcceptType = AcceptType>(args: Specific<RequestPUT, A>): Promise<TResponse<A>>
export function put<Out extends Json = Json>(args: Specific<RequestPUT, "Json">): Promise<Out>
export function put(args: Specific<RequestPUT>) {
	return __({ ...args, method: "PUT" }) as any
}

export function patch<A extends AcceptType = AcceptType>(args: Specific<RequestPATCH, A>): Promise<TResponse<A>>
export function patch<Out extends Json = Json>(args: Specific<RequestPATCH, "Json">): Promise<Out>
export function patch(args: Specific<RequestPATCH>) {
	return __({ ...args, method: "PATCH" }) as any
}

export function del<A extends AcceptType = AcceptType>(args: Specific<RequestDELETE, A>): Promise<TResponse<A>>
export function del<Out extends Json = Json>(args: Specific<RequestDELETE, "Json">): Promise<Out>
export function del(args: Specific<RequestDELETE>) {
	return __({ ...args, method: "DELETE" }) as any
}

export function get<A extends AcceptType = AcceptType>(args: Specific<RequestGET, A>): Promise<TResponse<A>>
export function get<Out extends Json = Json>(args: Specific<RequestGET, "Json">): Promise<Out>
export function get(args: Specific<RequestGET>) {
	return __({ ...args, method: "GET" }) as any
}
// const got = get<{ arr: Array<number> }>({ url: "/foo/:app/bar", params: { x: "" }, accept: "Json" })

export function any<A extends AcceptType = AcceptType>(args: RequestArgs & { accept: A }): Promise<TResponse<A>>
export function any<Out extends Json = Json>(args: RequestArgs & { accept: "Json" }): Promise<Out>
export function any(args: RequestArgs) {
	return __(args)
}
// const r = req<{ num: number, str: string }>({ url: "", body: {}, accept: "Json", method: "POST" }).then(x => x)

async function __<R extends RequestArgs = RequestArgs>(args: R): Promise<TResponse<R["accept"]>> {
	const queryParams = "query" in args ? `?${getQueryString(args.query)}` : ""

	const urlEffective = `${trimRight(args.url, "/")}${queryParams}`
	if ("params" in args) {
		// eslint-disable-next-line fp/no-unused-expression
		Object.entries(args.params ?? {})
			.forEach(entry => urlEffective.replace(`/:${entry[0]}/`, entry[1]))
	}

	const contentType: AcceptType | undefined = (("body" in args && args.body !== null)
		? (() => {
			switch (true) {
				case typeof args.body === "string": return "Text"
				case args.body instanceof FormData: return "Multi"
				case args.body instanceof URLSearchParams: return "Url"
				case args.body instanceof ReadableStream: return "Octet"
				case args.body instanceof ArrayBuffer: return "Binary"
				case args.body instanceof Blob: return "Binary"
				case typeof args.body === "object": return "Json"
			}
		})()
		: undefined
	)

	const body = (("body" in args && args.body !== null)
		? (() => {
			switch (true) {
				case typeof args.body === "string":
				case args.body instanceof FormData:
				case args.body instanceof URLSearchParams:
				case args.body instanceof ReadableStream:
				case args.body instanceof ArrayBuffer:
				case args.body instanceof Blob: return args.body as BodyInit
				case typeof args.body === "object": return JSON.stringify(args.body)
			}
		})()

		: undefined
	)

	return fetch(urlEffective, {
		method: args.method,
		body,
		headers: {
			...args.headers,
			...args.accept ? { 'Accept': MIME_TYPES[args.accept] } : {},
			...contentType ? { 'ContentType': MIME_TYPES[contentType] } : {}
		},
	}).then(response => {
		if (!String(response.status).startsWith("2")) {
			throw `HTTP error response from request to ${args.url}\n${response.statusText}`
		}
		else {
			// const accept = args.headers ? (args.headers as Obj).Accept as MIMETypeString : undefined
			switch (args.accept) {
				case "Binary": return response.arrayBuffer()
				case "Octet": return response.blob()
				case "Json": return response.json()
				// case "JsonWrapped": return response.json().then(j => ({ data: j }))
				case "Text": return response.text()
				default: return response.body
			}
		}
	}).catch(err => {
		throw `Error making request to ${args.url}\n${err}`
	})
}

/** Generate query string from query object */
function getQueryString<T extends Obj<string> = Obj<string>>(obj?: T, excludedValues: unknown[] = [undefined, null]) {
	if (!obj)
		return ""
	return Object.keys(obj)
		.filter(k => /*obj.hasOwnProperty(k) &&*/ !excludedValues.includes(obj[k]))
		.map(k => `${encodeURIComponent(k)}=${encodeURIComponent(obj[k])}`)
		.join("&")
}

type Specific<R extends RequestArgs = RequestArgs, A extends AcceptType = AcceptType> = Omit<R, "method"> & { accept: A }

type AcceptType = keyof typeof MIME_TYPES

type TResponse<A extends AcceptType | undefined> = (
	A extends "Json" ? Json | JsonArray :
	// A extends "JsonWrapped" ? Wrapped<Json> :
	A extends "Text" ? string :
	A extends "Octet" ? Blob :
	A extends "Binary" ? ArrayBuffer :
	ReadableStream<Uint8Array> | null
)


