# Settings
from urllib import request
from bs4 import BeautifulSoup
debug = False  # 调试模式
readFromFile = True  # True:从文件读取代码  False:从aurl读取代码
translator = "SPGoding"  # 您的称呼
aurl = ""

# 感谢 kakagou12 制作的[url=http://www.mcbbs.net/thread-828470-1-1.html]博文转换器[/url]

def tagTrans(sentences):
    # 统一对零散使用的标签进行转换
    # em -> i
    # strong -> b
    # p -> color=Silver
    # li -> [*], color=Silver
    # ul -> list
    # ol -> list=1
    # code -> color=DarkOrchid
    # &lt; -> <
    # &rt; -> >
    # a href -> url= , color=#008000

    bbscode = {"<em>": "[i]",
               "</em>": "[/i]",
               "<strong>": "[b]",
               "</strong>": "[/b]",
               "<p>": "[spoiler]",
               "</p>": "[/spoiler]",
               "<li>": "[*][color=Silver]",
               "</li>": "[/color]",
               "<ul>": "[list]",
               "</ul>": "[/list]",
               "<ol>": "[list=1]",
               "</ol>": "[/list]",
               "<code>": "[color=DarkOrchid]",
               "</code>": "[/color]",
               "&lt;": "<",
               "&gt;": ">",
               "<a href=\"": "[url=",
               "\">": "][color=#008000]",
               "</a>": "[/color][/url]",
               "<td>": "[td]",
               "<tr>": "[tr]",
               "</td>": "[/td]",
               "</tr>": "[/tr]"}

    result = []
    for s in sentences:
        for key in bbscode:
            s = s.replace(key, bbscode[key])
        result.append(s)
    return result


def p(s):
    ans = str(s)
    spt = True
    for i in s.children:
        if "<code>" in str(i):
            ans += str(i)
            spt = True
        elif "<a href" in str(i):
            ans += "<[url=" + i.attrs["href"] + \
                "][color=#008000]链接描述[/color][/url]>"
            spt = True
        elif spt:
            spt = False
            ans += "文本"
    ans += "\n\n"
    return ans


list_counter = 0  # 用于避免列表嵌套


def uolist(li):
    global list_counter
    ans = ""
    list_stack = []
    lenstack = []
    if list_counter == 0:  # 处理新列表
        list_counter = len(tag.find_all(['ul', 'ol']))
        for line in str(li).split('\n'):
            if line in ["<ul>", "<ol>"]:
                list_stack.append(line)
                lenstack.append(1)
                ans += "<ul>\n"
            elif line in ["</ul>", "</ol>"]:
                list_stack.pop()
                lenstack.pop()
                ans += "</ul>\n"
            if "<li>" in line:
                snum = ""
                # sorry for ctrl+c&v // YOU DON'T HAVE TO APOLOGIZE. - SPGoding
                if "<ul>" in line:
                    list_stack.append(line)
                    lenstack.append(1)
                    ans += "<ul>\n"
                if list_stack[-1] == "<ol>":
                    snum = str(lenstack[-1]) + ". "
                    lenstack[-1] += 1
                ans += "[*][color=Silver]"+snum+line[4:-5] + \
                    "[/color]\n[*]"+snum+line[4:-5]+'\n'
    else:
        list_counter -= 1  # 跳过嵌套导致的额外列表标签
    return ans


# 0 读取源代码
if readFromFile:
    f = open("urlsrc.txt", "r", encoding="utf-8")
    srcode = f.read()
    f.close()
else:
    page = request.urlopen(aurl)
    srcode = page.read()
Soup = BeautifulSoup(srcode, "html.parser")
f = open("bbssrc.txt", "w", encoding="utf-8")

# 1 输出标题
title = Soup.find("h1").get_text().strip()  # 标题一般在第一个h1标签
f.write("[postbg]bg3.png[/postbg]\n")  # poster for bbs
f.write("[align=center][img]"+Soup.find("img",
                                        class_='img-fluid').attrs['src']+"[/img]\n")  # head image
f.write("[color=Silver][b][size=6]" + title + "[/size]\n")  # head title
f.write("[size=4]"+Soup.find("p", class_='lead text-center').get_text().strip() +
        "[/size][/color]\n")  # subhead
f.write("[size=6]标题[/size]\n[size=4]副标题[/size][/align][/b]\n\n")

# 2 处理段落
# 先将标签转换成字符串，然后将字符串转换为bbscode
paras = Soup.find_all("div", class_=[
                      'article-paragraph', 'article-paragraph--image', 'article-paragraph--video', 'attributed-quote'])
get_snapshot = False

for para in paras:
    sentences = []

    # 清理除href外的a标签属性
    for a_tag in para.find_all('a'):
        # 方便接下来检测按钮
        if "class" in a_tag.attrs and "btn" in a_tag.attrs["class"]:
            a_tag.i.attrs["class"].append("btn")
        redun = [attr for attr in a_tag.attrs if attr != 'href']
        for attr in redun:
            del a_tag[attr]

    # 文字
    if 'article-paragraph' in para.attrs['class']:
        available_tags = ["p", "ul", "ol", "h1", "h2",
                          "h3", "h4", "h5", "blockquote", "a", "table"]
        for tag in para.find_all(available_tags):
            # p标签包含段落文字
            if tag.name in ['p']:
                sentences.append(p(tag))

            # ul ol标签包含列表
            elif tag.name in ['ul', 'ol']:
                sentences.append(uolist(tag))

            # blockquote标签包含绿色条引用文字
            elif tag.name == 'blockquote':
                quote = tag.get_text().replace("&ldquo", "\"").replace(
                    "&rdquo", "\"").replace("&#39;", "\'").strip()
                sentences.append(
                    "\n\n[indent][size=4][color=SeaGreen][b]|[/b][/color][color=Silver]" + quote + "[/color][/size][/indent]")
                sentences.append(
                    "\n\n[indent][size=4][color=SeaGreen][b]|[/b][/color]" + quote + "[/size][/indent]")

            # btn是按钮
            elif tag.name == 'a' and tag.i and "btn" in tag.i.attrs["class"]:
                btnlink = tag.attrs["href"]
                btntext = tag.find("span").string
                btnlen = len(btntext) * 10 + 150
                sentences.append('''[align=center][table={},#4dd728]\n[tr][td][table={},#36b030]\n[tr][td][align=center][b]
[url={}][color=White][size=3]{}[/size]\n[size=4]按钮文本<[/size][/color][/url]
[/b][/align][/td][/tr]
[/table][/td][/tr]
[/table][/align]\n'''.format(btnlen, btnlen-10, btnlink, btntext))

            # table 即为表格
            elif tag.name == "table":
                sentences.append("[align=center][table=80%]\n")
                th = "[tr]"
                for td in tag.thead.find_all("th"):
                    th += "[td][b][color=Silver]" + td.string + "[/color]\n" + td.string + "[/b][/td]"
                sentences.append(th + '[/tr]\n')
                for t in str(tag.tbody)[7:-8].split('\n'):
                    if t[4:-5] != "":
                        tt = t[4:-5]
                        t = t[0:4] + "[color=Silver]" + tt + "[/color]\n" + tt + t[-5:]
                    if debug:
                        print(t)
                    if t != "":
                        sentences.append(t)
                sentences.append("[/table][/align]")

            # h1~5包含标题
            elif tag.name[0] == 'h' and tag.name[1] in '12345':
                if debug:
                    print(tag.contents)
                if ("Get the" or "Get 1.") in str(tag.string):  # 进入版本发布模式，跳过接下来的处理
                    get_snapshot = True
                    break
                # h1 ~ h4 -> b, size= (7-level), ALL CAPS
                # h5 -> size=2, Title case

                else:
                    # for c in tag.contents:
                    #    title_text+=str(tag.contents[c])
                    title_text = ""
                    size_level = 7-int(tag.name[1])
                    if size_level > 2:
                        for c in tag.contents:  # <code>Foo bar</code> or 'Foo bar'
                            if type(c) == type(tag):
                                c.string = c.string.upper()
                                title_text += str(c)
                            else:
                                title_text += c.upper()
                    else:
                        size_level = 3
                    sentences.append("[b][size=" + str(size_level) + "][color=Silver]" +
                                     title_text + "[/color]\n" + title_text + "[/size][/b]\n\n")

    # 图片
    elif 'article-paragraph--image' in para.attrs['class']:
        for tag in para.find_all(["p", "img"]):
            if tag.attrs.get('src'):
                sentences.append("\n[align=center][img]" +
                                 str(tag.attrs['src']) + "[/img][/align]\n")
            else:
                sentences.append("[align=center][b]" +
                                 str(tag) + "\n图片描述[/b][/align]\n\n")

    # 视频封面
    elif 'article-paragraph--video' in para.attrs['class']:
        sentences.append("\n[align=center][img]" +
                         str(para.img.attrs['src']) + "[/img][/align]\n")

    # 引用块
    else:
        qt = para.blockquote
        quote = qt.get_text().replace("&ldquo", "\"").replace(
            "&rdquo", "\"").replace("&#39;", "\'")
        if 'attributed-quote__text' in qt.attrs['class']:
            sentences.append(
                "[img=40,28]https://ooo.0o0.ooo/2017/06/14/5941457d17453.png[/img][b]————————————————————————————[/b]\n")
            sentences.append("[img=33,64]"+para.img.attrs['src']+"[/img][color=Silver]" +
                             quote + "[/color]\n            引用文字\n            " + para.cite.get_text())
            sentences.append(
                "[align=right][b]————————————————————————————[/b][img=40,28]https://ooo.0o0.ooo/2017/06/14/5941457d216ca.png[/img][/align]\n")
        # else: #green quote is not put in quote para
            #sentences.append("\n\n[indent][size=4][color=SeaGreen][b]|[/b][/color]"+ quote + "[/size][/indent]\n\n")

    # 最后一步，写入文件
    sentences = tagTrans(sentences)
    for s in sentences:
        #if debug: print(s)
        f.write(s)
    if get_snapshot:
        break  # 通常在get snapshot段落之后是没有更多内容的

# 3 结尾信息
if get_snapshot:
    server_url = Soup.find("a", text="Minecraft server jar").attrs['href']
    f.write('''\n\n[hr]\n[align=center][table=70%,#EDFBFF]
[tr][td][align=center][size=3][color=#D6D604][b]官方服务端下载地址[/b][/color][/size][/align][/td][/tr]
[tr][td][align=center][url={0}]{0}[/url][/align][/td][/tr]
[/table][/align]'''.format(server_url))

else:
    attribution = Soup.find("dl", class_="attribution__details").find_all("dd")
    if debug:
        print(translator, aurl, title, attribution)
    if Soup.find("div", class_="end-with-block"):
        f.write(
            "[img=16,16]https://ooo.0o0.ooo/2017/01/30/588f60bbaaf78.png[/img]\n\n")
    f.write("【" + translator + " 译自 [url=" + aurl + "]" + title + "[/url]】\n")
    f.write("【作者 " + attribution[0].get_text() +
            "，发布时间 " + attribution[1].get_text()+"】")

# end with closing file
f.close()
