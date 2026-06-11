// index.html에 선언된 <div class="root"></div>
const container = document.querySelector(".root")
const content = document.createElement("div")

const ajax = new XMLHttpRequest() //비동기통신을 지원하는 클래스를 메모리 로딩함
// 해커 뉴스 서버에 접속해서 뉴스제목, 뉴스상세내용(@id.json, replace)
const TITLE_URL = "https://api.hnpwa.com/v0/news/1.json"
//실제로 클릭했을 때 그값을 넣어주어야 한다. - 일단 마킹만 해둔다.-그대로 쓰는값은아니다.
const CONTENT_URL = "https://api.hnpwa.com/v0/item/@id.json"
ajax.open("GET", TITLE_URL, false) 
ajax.send()
const newsTitle = JSON.parse(ajax.response) 
console.log(newsTitle);
//js코드에서 태그를 만든다.
const ul = document.createElement("ul")
for(let i=0;i<5;i++){
    const li = document.createElement("li")
    //이전에는 a태그를 문자열 안에 포함시켰다.
    //지금은 DOM api를 이용해서  a태그를 만들었다.
    const a = document.createElement("a")
    //    <a href="#${news[i].id}">${news[i].title}(${news[i].comments_count})</a>
    a.href = `#${newsTitle[i].id}`
    a.innerHTML = `${newsTitle[i].title}(📢${newsTitle[i].comments_count})`
    // <ul><li><a href=''>뉴스제목</a></li></ul> - 이렇게 보는게 더 직관적이야
    li.appendChild(a) //DOM api 함수사용해서 상속관계를 나타낸다.
    ul.appendChild(li) // <ul><li></li></ul>
}// end of for [[newsTitle]]

// const div = document.querySelector(".root").appendChild(ul)
//원천이 하나인데 사용하는 곳이 여러군데 이면 그 사용갯수에 따라 바꾸어야 하는 문제가 있다.
//id가 root가 아니라 home으로 바뀌면 두 군데 모두 수정해야 함.
container.appendChild(ul)
container.appendChild(content)


/******************************************************************************
 * 어떻게 클릭했는지 알 수 있을까?
 * 제목을 클릭했을 때 해시가 변경된다는 것을 알 수 있는데 hashchange 이벤트가 일어났을 때
 * id를 추출해서 상세내용을 가지고 오는 코드를 작성할 수 있을 것이다. 
 * hashchange가 일어났을 때 id를 어떻게 가져올 수 있을까?
 * location객체는 주소와 관련된 다양한 정보를 제공해 준다. 
 * 해시는 주소에 붙어 있다. 
/****************************************************************************** */
window.addEventListener(
    "hashchange", //이벤트소스에 대한 처리를 담당하는 이벤트 핸들러 이름이다.
    () => {
        console.log(location.hash);
        console.log(`The hash has changed! ===> ${location.hash.substring(3)}`);
        const id = location.hash.substring(1) //숫자앞에 #을 잘라내는 코드임
        console.log("id : " + id);
        //console.log(CONTENT_URL.replace("@id", id))
        ajax.open("GET", CONTENT_URL.replace("@id", id), false)
        ajax.send() //send함수가 호출될 때 해커뉴스 서버에 요청을 보냅니다.
        //contents는 상세내용을 가진 string
        //content는 div태그의 변수명
        const contents = JSON.parse(ajax.response)
        const title = document.createElement("h1")
        title.innerHTML = contents.title
        content.appendChild(title)
    },
);
/****************************************************************************** 
개인적으로 클라이언트 애플리케이션을 만들 때 제일 관심을 갖게 되는 것이 화면 전환임.
어떻게 하면 화면을 전환시킬 수 있을까? 
예를 들면 iOS앱을 만든다거나  혹은 안드로이드 앱을 만들기 위해서 학습을 한다거나 
혹은 윈도우 애플리케이션 UI를 가지 애플리케이션을 만들 때 화면을 어떻게 처리하는가
화면의 네비게이션을 어떻게 처리하는가 그 구조는 어떻게 만들어지는가를 제일 먼저 이해하는게 
그 플랫폼의 특성을 빠르게 이해하는데 도움이 많이 됨.
그래서 웹 어플리케이션도 마찬가지로 우리가 흔히 말하는 싱글 페이지 어플리케이션 
SPA라고 보통 많이 얘기함.
하나의 어플리케이션이 화면을 여러 개를 갖고 있고 일반적인 앱처럼 화면을 계속 전환하는 
현재의 액티브한 화면을 페이지로 보여주는 형식의 애플리케이션을 SPA라고 애기를 하는데 
웹 애플리케이션도 실제로 화면 전환이 굉장히 중요함. 보통 라우팅이라고도 애기를 하고 
웹 페이지와 달리 웹페이지는 링크 태그를 이용해서 다른 HTML 을 부르면 그냥 새로운 HTML이 로딩이 되는 거고
브라우저를 이용해서 뒤로 가기, 앞으로 가기 하면서 전환을 하는 거지 
실제로 하나의 애플리케이션에 다양한 화면들이 전환되는 그런 것과는 상황이 다르다.

그래서 웹 애플리케이션을 가지고 화면을 어떻게 전환시킬 것인가를 먼저 한 번 만들어 보도록 하겠다.
지금 저희가 만든 웹은 UI라고 할 것도 없는 굉장히 간단하게 10개의 타이틀 제목만 
이렇게 보여주는 목록만 보여주는 상태인데. 여기서 타이틀을 클릭하면 그 타이틀에 해당하는 
글의 내용까지는 아니고, 내용을 가지고 있는 데이터를 가지고 오고 UI적으로는 가져온 데이터에서의 타이틀만 
다른 뷰로 처리해 보는 과정까지를 이 장에서 진행해 보도록 하겠다.

/****************************************************************************** */






