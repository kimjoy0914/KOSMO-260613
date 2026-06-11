const container = document.querySelector(".root")
const content = document.createElement("div")
const ajax = new XMLHttpRequest() //비동기통신을 지원하는 클래스를 메모리 로딩함
const TITLE_URL = "https://api.hnpwa.com/v0/news/1.json"
const CONTENT_URL = "https://api.hnpwa.com/v0/item/@id.json"
// 현재 바라보는 페이지 번호를 기억할 변수 선언
const store = {
    currentPage: 1,
}
getData = (url) => { // url:TITLE_URL,  CONTENT_URL.replace("@id", id)
    ajax.open("GET", url, false)  
    ajax.send()
    return JSON.parse(ajax.response) 
}/////////end of getData

getNewsTitle = () => {
    const newsTitle = getData(TITLE_URL) 
    const newsList = [] //array
    newsList.push("<ul>")
    //for(let i=0;i<20;i++){
    // 43 -> 1 ~ 10 | 11-20 | 21-30 | 31 - 40 | 41 - 43 break
    for(let i=(store.currentPage - 1) * 10;i < store.currentPage * 10;i++){
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

    newsList.push(`
        <div>
            <a href="#/page/${store.currentPage > 1 ? store.currentPage -1 : 1}">이전페이지</a>
            <a href="#/page/${store.currentPage < 3  ? store.currentPage +1 : 3}">다음페이지</a>
        </dvi>
    `)

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
            <a href="#/page/${store.currentPage}">목록으로</a>
        </div>
    `
}// end of getNewsDetail

router = () => {
    const routerPath = location.hash
    //===세개면 타입도 비교하고 값도 비교해서 모두 일치할때만 true
    if(routerPath === ''){
        //첫 진입일때
        getNewsTitle() //뉴스 제목 보기
    }
    // routerPath앞단에 page가 들어 있으면 이건 페이징이죠. 글 내용을 보는게 아닙니다.
    //그래서 routerPage라고 하는 문자열 안에 이런 문자열이 들어가 있는지 찾는 메소드가 
    // 있는데 indexOf라고 합니다. 이 메소드는 입력으로 주어진 문자열을 찾아서 있다면 0
    // 이상의 값을 리턴하고요 없다면 -1을 리턴합니다. 
    // #/page/ 이런 형태로 들어와 있으면 이게 0보다 크면 page 라고 하는 해시변경이라는 걸
    //확인할 수 있어요 그랬을 때 페이징을 하고 그렇지 않으면 show가 들어오겠죠. 
    // 그 땐 else 를 읽어서 처리합니다.
    else if(routerPath.indexOf("#/page/") >= 0) {
        //store.currentPage = 2
        //주소 뒤에 붙는 값(query string)들은 모두 문자타입이다. 
        //현재 바라보고 있는 페이지의 번호를 store객체안에 currentPage라는 변수에
        //관리하고 있다. 이전페이지이면 -1, 다음페이지 이면 +1 해야 되므로 
        //숫자타입으로 변경해야 합니다.- Number()
        store.currentPage = Number(routerPath.substring(7))
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






