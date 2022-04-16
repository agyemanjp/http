import { pick, keys } from "@agyemanjp/standard/object"
import { ExtractRouteParams, MIMETypeKey, Json, BodyType } from "./types"
import { request } from "./core"

export const proxy = {
	get: queryRoute("get"),
	delete: queryRoute("delete"),
	post: bodyRoute("post"),
	patch: bodyRoute("patch"),
	put: bodyRoute("put"),
}

function queryRoute(method: "get" | "delete") {
	return {
		route: <Route extends string>(url: Route) => ({
			queryType: <Query extends Json<string>>() => ({
				returnType: <Res extends Json>() =>
					async (args: Query & ExtractRouteParams<Route>) =>
						request[method]<Res>({ url, ...parseArgs(url, args, "query"), accept: "Json" }),
				responseType: <Accept extends MIMETypeKey>(accept: Accept) =>
					async (args: Query & ExtractRouteParams<Route>) =>
						request[method]({ url, ...parseArgs(url, args, "query"), accept })
			}),
			headersType: <Headers extends Json<string>>() => ({
				returnType: <Ret extends Json>() =>
					async (args: Headers & ExtractRouteParams<Route>) =>
						request[method]<Ret>({ url, ...parseArgs(url, args, "headers"), accept: "Json" }),
				responseType: <Accept extends MIMETypeKey>(accept: Accept) =>
					async (args: Headers & ExtractRouteParams<Route>) =>
						request[method]({ url, ...parseArgs(url, args, "headers"), accept })
			})
		})
	}
}

function bodyRoute(method: "post" | "put" | "patch") {
	return {
		route: <Route extends string>(url: Route) => ({
			bodyType: <Body extends BodyType>() => ({
				returnType: <Res extends Json>() =>
					async (args: Body & ExtractRouteParams<Route>) =>
						request[method]<Body, Res>({ url, ...parseArgs(url, args, "body"), accept: "Json" }),
				responseType: <Accept extends MIMETypeKey>(accept: Accept) =>
					async (args: Body & ExtractRouteParams<Route>) =>
						request[method]({ url, ...parseArgs(url, args, "body"), accept })
			})
		})
	}
}

function parseArgs<R extends string, Q extends Json<string>>(url: R, args: Q & ExtractRouteParams<R>, kind: "query"): { query: Q, params: ExtractRouteParams<R> }
function parseArgs<R extends string, H extends Json<string>>(url: R, args: H & ExtractRouteParams<R>, kind: "headers"): { headers: H, params: ExtractRouteParams<R> }
function parseArgs<R extends string, B extends Json<string>>(url: R, args: B & ExtractRouteParams<R>, kind: "body"): { body: B, params: ExtractRouteParams<R> }
function parseArgs<R extends string, T extends Json<string>>(url: R, args: T & ExtractRouteParams<R>, kind: "query" | "headers" | "body") {
	return {
		[kind]: pick(args, ...keys(args).filter(k => !url.includes(`/:${k}/`))) as any,
		params: pick(args, ...keys(args).filter(k => url.includes(`/:${k}/`))) as any as ExtractRouteParams<R>
	}
}


// const proxyGet = proxy.get.route("/projects/:api").queryType<{ category: string }>().responseType("Text")
// const g = proxyGet({ category: "cat", api: "nxthaus" })

// const proxyPost = proxy.post.route("/projects/:api").bodyType<{ category: string }>().returnType<{ x: number }>()
// const p = proxyPost({ category: "cat", api: "nxthaus" })