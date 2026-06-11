const vertical = document.querySelector('.vertical');
const horizontal = document.querySelector('.horizontal');
const target = document.querySelector('.target');
const tag = document.querySelector('.tag');

document.addEventListener('mousemove', event => {
  const x = event.clientX;//1
  const y = event.clientY;//1
  console.log(`${x} ${y}`);//2

  vertical.style.left = `${x}px`;//3
  horizontal.style.top = `${y}px`;//3

  target.style.left = `${x}px`;//4
  target.style.top = `${y}px`;//4
  //alt키 눌러서 여러 로우를 선택한 후  shift키로 갈무리 하면 한번에 수정가능
  tag.style.left = `${x}px`;//5
  tag.style.top = `${y}px`;//5

  tag.innerHTML = `${x}px, ${y}px`;
  
  
});
