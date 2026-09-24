import * as cheerio from "cheerio";
import {Feed} from "feed";
import {UA} from "../others/strings.js";

const PAGE_PATH = "/wiki/Wikipedia:%E5%8A%A8%E6%80%81%E7%83%AD%E9%97%A8";

const CHANGE_MAP = {
    "▲": "排名上升",
    "▼": "排名下降",
    "-": "排名无变化",
    "+": "新进排名",
};

function parseDate(text = "") {
    const m = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);

    if (!m) {
        return null;
    }

    return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

export async function wikipediahot(input, baseUrl) {
    const lang = input || "zh";
    const origin = `https://${lang}.wikipedia.org`;
    const pageUrl = `${origin}${PAGE_PATH}`;
    const currentRssUrl = `${baseUrl}?wikipediahot=${lang}`;

    const resp = await fetch(pageUrl, {
        headers: {
            "User-Agent": UA,
            "Accept-Language": "zh-CN,zh;q=0.9",
        }
    });

    if (!resp.ok) {
        throw new Error(`维基百科请求失败: ${resp.status}`);
    }

    const html = await resp.text();
    const $ = cheerio.load(html);

    const caption = $("table.wikitable caption").first().text().trim();
    const itemDate = parseDate(caption);

    const now = new Date();

    const feed = new Feed({
        feedLinks: {rss: currentRssUrl},
        image: "https://www.wikipedia.org/portal/wikipedia.org/assets/img/Wikipedia-logo-v2.png",
        link: pageUrl,
        title: `维基百科动态热门${caption ? ` - ${caption}` : ""}`,
        description: caption ? `${caption}浏览量最高的条目` : "维基百科动态热门",
        updated: now,
    });

    $("table.wikitable tbody tr").each((i, el) => {
        const tds = $(el).find("> td");

        if (tds.length < 5) {
            return;
        }

        const rank = tds.eq(0).text().trim();

        const entryLink = tds.eq(1).find("a").first();
        const name = entryLink.attr("title") || entryLink.text().trim();
        const href = entryLink.attr("href");

        if (!name || !href) {
            return;
        }

        const link = new URL(href, origin).href;

        const rating = tds.eq(2).find("img").attr("alt")?.trim() || "未评级";

        const views = tds.eq(3).text().trim();

        const changeSpan = tds.eq(4).find("span").first();
        const changeSymbol = changeSpan.text().trim();
        const change = CHANGE_MAP[changeSymbol] || "昨日排名数据缺失";

        const fullContent = `
<p><a href="${link}">${name}</a></p>
<p>排名: ${rank} | 评级: ${rating} | 浏览量: ${views} | 排名变化: ${change}</p>
`;

        feed.addItem({
            content: fullContent,
            date: itemDate || now,
            link: link,
            title: `${rank}. ${name}`,
        });
    });

    return feed.rss2();
}
