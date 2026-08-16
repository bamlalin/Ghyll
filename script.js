document.addEventListener('DOMContentLoaded', () => {
	const joinModal = document.getElementById('joinModal');
	const gameBoard = document.getElementById('gameBoard');
	const btnJoin = document.getElementById('btnJoin');
	const playerNickname = document.getElementById('playerNickname');
	const displayPlayerName = document.getElementById('displayPlayerName');

	btnJoin.addEventListener('click', () => {
		const name = playerNickname.value.trim();
		if (name !== '') {
			displayPlayerName.textContent = name.toUpperCase() + ' (YOU)';
		}
		
		// ซ่อน Modal และเปิดหน้ากระดาน (แสดงสถานะเราคนเดียว 1/2)
		joinModal.classList.add('hidden');
		gameBoard.classList.remove('hidden');
	});
});