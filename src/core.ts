/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-shadow */
/* eslint-disable indent */
import { fetch } from "cross-fetch"
import { Obj, pick, keys, trimRight } from "@agyemanjp/standard"
import { Method, MIME_TYPES } from "./types"


export const proxy = {
	get: {
		route: <Route extends string>(url: Route) => ({
			queryType: <Query extends sObj>() => ({
				returnType: <Res extends Json>() =>
					async (args: Query & ExtractRouteParams<Route>) =>
						get<Res>({ url, ...parseGetArgs(url, args), accept: "Json" }),
				responseType: <Accept extends MIMETypeKey>(accept: Accept) =>
					async (args: Query & ExtractRouteParams<Route>) =>
						get({ url, ...parseGetArgs(url, args), accept })
			})
		})
	},
	post: {
		route: <Route extends string>(url: Route) => ({
			bodyType: <Body extends BodyType>() => ({
				returnType: <Res extends Json>() =>
					async (args: Body & ExtractRouteParams<Route>) =>
						post<Body, Res>({ url, ...parsePostArgs(url, args), accept: "Json" }),
				responseType: <Accept extends MIMETypeKey>(accept: Accept) =>
					async (args: Body & ExtractRouteParams<Route>) =>
						post({ url, ...parsePostArgs(url, args), accept })
			})
		})
	}
}

// const proxyGet = proxy.get.route("/projects/:api").queryType<{ category: string }>().responseType("Text")
// const g = proxyGet({ category: "cat", api: "nxthaus" })

// const proxyPost = proxy.post.route("/projects/:api").bodyType<{ category: string }>().returnType<{ x: number }>()
// const p = proxyPost({ category: "cat", api: "nxthaus" })


export function post<In extends BodyType = BodyType, A extends MIMETypeKey = MIMETypeKey>(args: RequestPOST<In> & { accept: A }): Promise<TResponse<A>>
export function post<In extends BodyType = BodyType, Out extends Json = Json>(args: RequestPOST<In> & { accept: "Json" }): Promise<Out>
export function post(args: RequestPOST) {
	return __("POST", args) as any
}
// const x = put({ url: "", body: { a: "" }, accept: "Octet" }).then(y => y)

export function put<In extends BodyType = BodyType, A extends MIMETypeKey = MIMETypeKey>(args: RequestPUT<In> & { accept: A }): Promise<TResponse<A>>
export function put<In extends BodyType = BodyType, Out extends Json = Json>(args: RequestPUT<In> & { accept: "Json" }): Promise<Out>
export function put(args: RequestPUT) {
	return __("PUT", args) as any
}

export function patch<In extends BodyType = BodyType, A extends MIMETypeKey = MIMETypeKey>(args: RequestPATCH<In> & { accept: A }): Promise<TResponse<A>>
export function patch<In extends BodyType = BodyType, Out extends Json = Json>(args: RequestPATCH<In> & { accept: "Json" }): Promise<Out>
export function patch(args: RequestPATCH) {
	return __("PATCH", args) as any
}

export function del<A extends MIMETypeKey = MIMETypeKey>(args: RequestDELETE & { accept: A }): Promise<TResponse<A>>
export function del<Out extends Json = Json>(args: RequestDELETE & { accept: "Json" }): Promise<Out>
export function del(args: RequestDELETE) {
	return __("DELETE", args) as any
}

export function get<A extends MIMETypeKey = MIMETypeKey>(args: RequestGET & { accept: A }): Promise<TResponse<A>>
export function get<Out extends Json = Json>(args: RequestGET & { accept: "Json" }): Promise<Out>
export function get(args: RequestGET) {
	return __("GET", args) as any
}
// const got = get<{ arr: Array<number> }>({ url: "/foo/:app/bar", params: { x: "" }, accept: "Json" })

export default { get, put, post, patch, delete: del, getQueryString, proxy }


async function __<R extends RequestArgs = RequestArgs>(method: Method, args: R): Promise<TResponse<R["accept"]>> {
	const queryParams = "query" in args ? `?${getQueryString(args.query)}` : ""

	const urlEffective = `${trimRight(args.url, "/")}${queryParams}`
	if ("params" in args) {
		// eslint-disable-next-line fp/no-unused-expression
		Object.entries(args.params ?? {})
			.forEach(entry => urlEffective.replace(`/:${entry[0]}/`, entry[1]))
	}

	const contentType: MIMETypeKey | undefined = (("body" in args && args.body !== null)
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
		method,
		body,
		headers: {
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

function parseGetArgs<Route extends string, Query extends sObj>(url: Route, args: Query & ExtractRouteParams<Route>) {
	return {
		query: pick(args, ...keys(args).filter(k => !url.includes(`/:${k}/`))) as any as Query,
		params: pick(args, ...keys(args).filter(k => url.includes(`/:${k}/`))) as any as ExtractRouteParams<Route>
	}
}
function parsePostArgs<Route extends string, Body extends BodyType>(url: Route, args: Body & ExtractRouteParams<Route>) {
	return {
		body: pick(args, ...keys(args).filter(k => !url.includes(`/:${k}/`))) as any as Body,
		params: pick(args, ...keys(args).filter(k => url.includes(`/:${k}/`))) as any as ExtractRouteParams<Route>
	}
}

type RequestBase = /*Omit<RequestInit, "method"> &*/ {
	url: string;
	accept?: MIMETypeKey;
	// customFetch?: typeof fetch;
}
type RequestGET<P extends sObj = sObj, Q extends sObj = sObj> = RequestBase & {
	// method: "GET";
	query?: Q;
	params?: P;
}
type RequestDELETE<P extends sObj = sObj, Q extends sObj = sObj> = RequestBase & {
	// method: "DELETE";
	query?: Q;
	params?: P;
}
type RequestPUT<B extends BodyType = BodyType, P extends sObj = sObj, Q extends sObj = sObj> = RequestBase & {
	// method: "PUT";
	query?: Q;
	params?: P;
	body: B;
	// contentType: keyof typeof MIME_TYPES;
}
type RequestPATCH<B extends BodyType = BodyType, P extends sObj = sObj, Q extends sObj = sObj> = RequestBase & {
	// method: "PATCH";
	query?: Q;
	params?: P;
	body: B;
	// contentType: keyof typeof MIME_TYPES;
}
type RequestPOST<B extends BodyType = BodyType> = RequestBase & {
	// method: "POST";
	body: B
	// contentType: "Json",
	// params?: Record<string, string>,
	// query?: Record<string, string>,
}

type RequestArgs = RequestGET | RequestDELETE | RequestPOST | RequestPUT | RequestPATCH

type TResponse<A extends keyof typeof MIME_TYPES | undefined> = (
	A extends "Json" ? Json :
	A extends "Text" ? string :
	A extends "Octet" ? Blob :
	A extends "Binary" ? ArrayBuffer :
	ReadableStream<Uint8Array> | null
)

type ExtractRouteParams<T extends string> = (
	string extends T
	? Record<string, string>
	: T extends `${infer Start}:${infer Param}/${infer Rest}`
	? { [k in Param | keyof ExtractRouteParams<Rest>]: string }
	: T extends `${infer Start}:${infer Param}`
	? { [k in Param]: string }
	: {}
)

// type ResponseType<R extends RequestBase> = Promise<TResponse<R["accept"]>>

type BodyType = Json | string | Blob | FormData | URLSearchParams | /*ArrayBufferView |*/ ArrayBuffer | ReadableStream

interface Json<V extends JsonValue = JsonValue> { [x: string]: V }
type JsonArray = Array<JsonValue>
type JsonValue = null | string | number | boolean | Date | Json | JsonArray
type sObj = Json<string>

type MIMETypeKey = keyof typeof MIME_TYPES
