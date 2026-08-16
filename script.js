document.addEventListener('DOMContentLoaded', () => {
    const btnJoin = document.getElementById('btnJoin');
    const joinModal = document.getElementById('joinModal');
    const playerNickname = document.getElementById('playerNickname');

    btnJoin.addEventListener('click', () => {
        const name = playerNickname.value.trim();
        if (name !== '') {
        // ซ่อนหน้า Modal ป๊อปอัป
        joinModal.style.display = 'none';
        console.log('Player joined:', name);
        } else {
        alert('กรุณากรอกชื่อเล่นก่อนเข้าร่วมโต๊ะครับ');
        }
    });
});