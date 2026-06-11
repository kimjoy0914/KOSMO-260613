const container = document.querySelector(".root")
const content = document.createElement("div")
const ajax = new XMLHttpRequest() //비동기통신을 지원하는 클래스를 메모리 로딩함
const TITLE_URL = "https://api.hnpwa.com/v0/news/1.json"
const CONTENT_URL = "https://api.hnpwa.com/v0/item/@id.json"
// 사용자 정의 함수를 선언하여 반복되는 코드를 줄여 봅시다.
// 다른 것은 URL주소만 다르므로 파라미터는 url만 받을 수 있는 변수 하나면 충분합니다.
getData = (url) => { // url:TITLE_URL,  CONTENT_URL.replace("@id", id)
    ajax.open("GET", url, false)  
    ajax.send()
    // open함수의 두 번째 파라미터인 URL만 다르고 요청에 대한 응답도 같은 형식의 코드임
    // 이 함수는 리턴 값도 공유할 수 있겠다 - 이해
    // 코딩은 같지만 url이 다르니까 응답값은 당연히 다르다.
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


//js코드에서 태그를 만든다.
const ul = document.createElement("ul")
for(let i=0;i<5;i++){
    const li = document.createElement("li")
    const a = document.createElement("a")
    a.href = `#${newsTitle[i].id}`
    a.innerHTML = `${newsTitle[i].title}(📢${newsTitle[i].comments_count})`
    li.appendChild(a) //DOM api 함수사용해서 상속관계를 나타낸다.
    ul.appendChild(li) // <ul><li></li></ul>
}// end of for [[newsTitle]]
container.appendChild(ul)
container.appendChild(content)

/*
우리는 서로 다른 URL을 요청합니다.(title, content)
첫번째 요청에 대한 응답과 두번째 요청에 대한 응답이 다르다.

서로 다른 URL은 변수에 담겨 있다.
이 정보는 사용자 정의 함수(getData(URL))의 파라미터로 사용하면 됩니다.
*/





