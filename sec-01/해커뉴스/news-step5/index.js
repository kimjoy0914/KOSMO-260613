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

getNewsTitle = () => {
    const newsTitle = getData(TITLE_URL) 
    const newsList = [] //array
    newsList.push("<ul>")
    for(let i=0;i<20;i++){
        // http://localhost:1234/#415887690
        // http://localhost:1234/#/show/415887690 -> #/s how / 
        newsList.push(`
            <li>
                <a href="#/show/${newsTitle[i].id}">
                    ${newsTitle[i].title}(📢${newsTitle[i].comments_count})
                </a>
            </li>            
        `)
    }// end of for [[newsTitle]]
    newsList.push("</ul>")
    // 자스는 배열 자체를 하나의 문자열로 합치는 기능을 제공함 - join임
    // 배열을 구분하는 구분자가 콤마이면 콤마를 기준으로 문자열을 합쳐 줍니다.
    container.innerHTML = newsList.join('')
}
// 제목을 클릭했을 때 상세보기 페이지를 구현하기 위한 함수 선언
getNewsDetail = () => {
    const id = location.hash.substring(7)
    console.log(id);//415887654
    const contents = getData(CONTENT_URL.replace("@id", id))
    container.innerHTML = `
        <h1>${contents.title}</h1>
        <div>
            <a href="#">목록으로</a>
        </div>
    `
}// end of getNewsDetail

router = () => {
    const routerPath = location.hash
    //===세개면 타입도 비교하고 값도 비교해서 모두 일치할때만 true
    if(routerPath === ''){
        //첫 진입일때
        getNewsTitle() //뉴스 제목 보기
    }else{
        getNewsDetail() //뉴스 상세내용 보기
    }
}
// 문제제기 - 현재는 구현된 라우터 함수가 호출되지 않는다.
// 해시값이 변경될 때만 호출되니까.......
// 최초 한 번은 그냥 좀 보여줘
window.addEventListener("hashchange", router);
router()


//createElement함수를 사용해서 태그를 추가하는 것이 직관적인가요?
//<div><ul>
//<li><a href="">제목1</a></li>
//<li><a href="">제목1</a></li>
//<li><a href="">제목1</a></li>
//<li><a href="">제목1</a></li>
//<li><a href="">제목1</a></li>
//</ul</div>
const ul = document.createElement("ul")

container.appendChild(ul)
container.appendChild(content)






