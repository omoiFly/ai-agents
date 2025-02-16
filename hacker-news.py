import io
import html
import requests
from bs4 import BeautifulSoup
from smolagents import HfApiModel, Tool, CodeAgent

from jinja2 import Environment
import datetime


# Change model provider by reference: https://huggingface.co/docs/smolagents/guided_tour?Pick+a+LLM=HF+Inference+API
model = HfApiModel()

class PDFParseTool(Tool):
    name = "pdf_parser"
    description = """
    This is a tool that returns the content from the given PDF link.
    It returns the whole readable content of the PDF file.
    """
    inputs = {
        "link": {
            "type": "string",
            "description": "the url link to an PDF file."
        }
    }
    output_type = "string"

    def forward(self, link: str):
        try:
            import PyPDF2
        except ImportError as e:
            raise ImportError("You must install package `PyPDF2` to run this tool: for instance run `pip install PyPDF2`.") from e
        try:
            r = requests.get(link)
            f = io.BytesIO(r.content)
            reader = PyPDF2.PdfReader(f)
            pages = reader.pages
            return "".join([page.extract_text() for page in pages])
        except requests.exceptions.Timeout:
            return "The request timed out. Please try again later or check the URL."
        except requests.exceptions.RequestException as e:
            return f"Error fetching the webpage: {str(e)}"
        except Exception as e:
            return f"An unexpected error occurred: {str(e)}"

def get_hacker_news_articles():
    """
    Get newest hacker news articles, parse article title and url.
    """
    response = requests.get("https://hnrss.org/newest")
    soup = BeautifulSoup(response.content, 'xml')
    articles = []
    for item in soup.find_all('item'):
        title = item.title.text
        link = item.link.text
        articles.append({'title': title, 'url': link})
    return articles

def get_content(url):
    resp = requests.get(url)
    return html.escape(resp.text)

def format(s):
    return f"""{s['title']}
{s['link']}
{s['summary']}
"""

agent = CodeAgent(tools=[PDFParseTool()], model=model, add_base_tools=True)
articles = get_hacker_news_articles()

summarized = []
for article in articles:
    summary = agent.run(f"""你是专业的科技杂志编辑，请阅读文章 '{article['title']}' 的链接 '{article['url']}' 的内容，运用你的专业能力，总结整理一篇内容概述。
在整理时请注意以下几个要点
- 如链接引用的是视频，请按照文章标题搜索分析相关信息
- 如链接引用的是PDF文件，请使用 `pdf_parser` 工具将PDF链接解析成文本
- 如果遇到其他无法正常处理的链接，请搜索文章标题并整理概述
- 如果遇到搜索失败，请参考标题根据你自己的理解撰写概述
- 总结的概述应该在 300 到 500 字之间
- 无论什么情况，概述都应该是以*中文*撰写的
爱你！ 
""".strip())
    summarized.append({
        'title': article['title'],
        'link': article['url'],
        'summary': summary
    })


template_string = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Hacker News 摘要</title>
    <style>
        body {
            font-family: "Microsoft JhengHei", Arial, sans-serif;
            margin: 40px auto;
            max-width: 800px;
            padding: 0 20px;
            line-height: 1.6;
            background-color: #f5f5f5;
        }
        .header {
            text-align: center;
            padding: 20px 0;
            background-color: #fff;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .news-item {
            background-color: #fff;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .news-title {
            margin-bottom: 10px;
        }
        .news-title a {
            color: #2c3e50;
            font-size: 22px;
            font-weight: bold;
            text-decoration: none;
            transition: color 0.3s ease;
        }
        .news-title a:hover {
            color: #3498db;
        }
        .news-date {
            color: #666;
            font-size: 14px;
            margin: 10px 0;
        }
        .news-summary {
            color: #444;
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            margin-top: 10px;
        }
        .generation-info {
            color: #666;
            font-size: 14px;
            text-align: center;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Hacker News 摘要</h1>
        <div class="generation-info">生成时间： {{ current_date }}</div>
    </div>
    
    {% for news in news_list %}
    <div class="news-item">
        <div class="news-title">
            <a href="{{ news.link }}" target="_blank">{{ news.title }}</a>
        </div>
        <div class="news-summary">
            {{ news.summary }}
        </div>
    </div>
    {% endfor %}
</body>
</html>
"""    

env = Environment()
template = env.from_string(template_string)

html = template.render(
    news_list=summarized,
    current_date=datetime.datetime.now()
)

with open('hacker_news_report.html', 'w', encoding='utf-8') as f:
    f.write(html)

