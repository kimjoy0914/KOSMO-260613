// HTML 요소 가져오기
const todoInput = document.querySelector("#todoInput");
const addBtn = document.querySelector("#addBtn");
const todoList = document.querySelector("#todoList");

// localStorage에서 기존 할 일 목록 가져오기
// 저장된 값이 없으면 빈 배열 사용
let todos = JSON.parse(localStorage.getItem("todos")) || [];

// 화면에 할 일 목록을 출력하는 함수
function renderTodos() {
  // 기존 목록 초기화
  todoList.innerHTML = "";

  // todos 배열을 반복하면서 화면에 li 태그 생성
  todos.forEach((todo, index) => {
    const li = document.createElement("li");
    li.className = "todo-item";

    const span = document.createElement("span");
    span.className = "todo-text";
    span.textContent = todo;

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "삭제";

    // 삭제 버튼 클릭 시 해당 할 일 삭제
    deleteBtn.addEventListener("click", () => {
      deleteTodo(index);
    });

    li.appendChild(span);
    li.appendChild(deleteBtn);
    todoList.appendChild(li);
  });
}

// localStorage에 todos 배열 저장하는 함수
function saveTodos() {
  localStorage.setItem("todos", JSON.stringify(todos));
}

// 할 일 추가 함수
function addTodo() {
  const text = todoInput.value.trim();

  // 빈 값 입력 방지
  if (text === "") {
    alert("할 일을 입력하세요.");
    return;
  }

  // 배열에 새 할 일 추가
  todos.push(text);

  // localStorage 저장
  saveTodos();

  // 화면 다시 그리기
  renderTodos();

  // 입력창 비우기
  todoInput.value = "";
  todoInput.focus();
}

// 할 일 삭제 함수
function deleteTodo(index) {
  // index 위치의 데이터 1개 삭제
  todos.splice(index, 1);

  // localStorage 다시 저장
  saveTodos();

  // 화면 다시 그리기
  renderTodos();
}

// 추가 버튼 클릭 이벤트
addBtn.addEventListener("click", addTodo);

// 엔터키로도 추가 가능
todoInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    addTodo();
  }
});

// 페이지가 처음 열릴 때 기존 저장 데이터 출력
renderTodos();