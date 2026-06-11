const ajax = new XMLHttpRequest() 
const TITLE_URL = "https://api.hnpwa.com/v0/news/1.json"
ajax.open("GET", TITLE_URL, false) 
ajax.send() 

const newsTitle = JSON.parse(ajax.response) 
const ul = document.createElement("ul")
for(let i=0;i<5;i++){
    const li = document.createElement("li")
    li.innerHTML = newsTitle[i].title;
    ul.appendChild(li)
}
const div = document.querySelector(".root").appendChild(ul)

