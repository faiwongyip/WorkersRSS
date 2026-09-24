// 由 scripts/gen-routers.mjs 自动扫描 routers 目录生成
import {routers} from "./routers/_registry.js"

// 统一的 CORS 响应头配置
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "*",
}

export default {
    async fetch(request, env, ctx) {
        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: corsHeaders
            })
        }

        const url = new URL(request.url)

        const baseUrl = url.origin + url.pathname

        const paramsArray = [...url.searchParams]

        let mode = null
        let value = null

        if (paramsArray.length > 0) {
            mode = paramsArray[0][0]
            value = paramsArray[0][1]
        }

        if (mode === "raw") {
            let targetUrlStr = value

            if (!targetUrlStr.startsWith("https://")) {
                targetUrlStr = "https://" + targetUrlStr
            }

            const targetUrl = new URL(targetUrlStr)

            let body = null

            if (request.method !== "GET" && request.method !== "HEAD") {
                body = await request.clone().arrayBuffer()
            }

            const fetchRequest = new Request(targetUrl.href, {
                method: request.method,
                headers: request.headers,
                body,
                redirect: "follow",
            })

            const resp = await fetch(fetchRequest)
            const text = await resp.text()

            return new Response(text, {
                status: resp.status,
                statusText: resp.statusText,
                headers: {
                    "content-type": "text/plain; charset=utf-8",
                    ...corsHeaders
                }
            })
        }

        if (mode) {
            try {
                const func = routers[mode]

                if (typeof func !== "function") {
                    throw new Error(`没有找到 ${mode} 路由`)
                }

                const result = await func(value, baseUrl,env)

                return new Response(result, {
                    headers: {
                        "content-type": "application/xml; charset=utf-8",
                        ...corsHeaders
                    }
                })

            } catch (error) {
                return new Response(
                    `错误: ${error.message || error}`,
                    {
                        status: 500,
                        headers: {
                            "content-type": "text/plain; charset=utf-8",
                            ...corsHeaders
                        }
                    }
                )
            }
        }

        return new Response("未知路由", {
            status: 200,
            headers: corsHeaders
        })
    }
}
