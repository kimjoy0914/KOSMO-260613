const container = document.querySelector(".root")
const content = document.createElement("div")
const ajax = new XMLHttpRequest() //비동기통신을 지원하는 클래스를 메모리 로딩함
const TITLE_URL = "https://api.hnpwa.com/v0/news/1.json"
const CONTENT_URL = "https://api.hnpwa.com/v0/item/@id.json"
getData = (url) => { // url:TITLE_URL,  CONTENT_URL.replace("@id", id)
    ajax.open("GET", url, false)  
    ajax.send()
    return JSON.parse(ajax.response) 
}/////////end of getData
const newsTitle = getData(TITLE_URL) 
window.addEventListener(
    "hashchange", //이벤트소스에 대한 처리를 담당하는 이벤트 핸들러 이름이다.
    () => {
    console.log(`The hash has changed! ===> ${location.hash.substring(3)}`);
        const id = location.hash.substring(1) //숫자앞에 #을 잘라내는 코드임
        const contents = getData(CONTENT_URL.replace("@id", id))
        const title = document.createElement("h1")
        title.innerHTML = contents.title
        content.appendChild(title)
    },
);


//createElement함수를 사용해서 태그를 추가하는 것이 직관적인가요?
//<div><ul>
//<li><a href="">제목1</a></li>
//<li><a href="">제목1</a></li>
//<li><a href="">제목1</a></li>
//<li><a href="">제목1</a></li>
//<li><a href="">제목1</a></li>
//</ul</div>
const ul = document.createElement("ul")
for(let i=0;i<5;i++){
    const div = document.createElement("div")
    //처음에 문자열로 처리했다가 -> DOM API변경함 -> 문제제기(직관적인가?) -> 구조파악 -> 크롤링도움
    div.innerHTML = `
        <li>
            <a href="#${newsTitle[i].id}">
                ${newsTitle[i].title}(📢${newsTitle[i].comments_count})
            </a>
        </li>
    `; //문장이 끝났다
    ul.appendChild(div.firstElementChild)
}// end of for [[newsTitle]]
container.appendChild(ul)
container.appendChild(content)






