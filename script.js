document.addEventListener('DOMContentLoaded', () => {
    const fetchButton = document.getElementById('fetch-button');
    const relayInput = document.getElementById('relay-input');
    const npubInput = document.getElementById('npub-input');
    const eventsContainer = document.getElementById('events-container');

    fetchButton.addEventListener('click', () => {
        const relayUrl = relayInput.value.trim();
        const npub = npubInput.value.trim();

        if (!relayUrl || !npub) {
            alert('Bitte Relay URL und npub eingeben.');
            return;
        }

        eventsContainer.innerHTML = 'Lade Events...';

        try {
            const { type, data: pubkey } = window.NostrTools.nip19.decode(npub);
            if (type !== 'npub') {
                throw new Error('Ungültiger npub.');
            }

            const pool = new window.NostrTools.SimplePool();
            const relays = [relayUrl];
            const filter = {
                authors: [pubkey],
                kinds: [1],
                limit: 10
            };

            let receivedEvents = [];

            const sub = pool.subscribe(
                relays,
                filter,
                {
                    onevent(event) {
                        receivedEvents.push(event);
                    },
                    oneose() {
                        console.log('End of stored events received.');
                        sub.close();
                        renderEvents();
                    },
                    onclose(reason) {
                        console.log('Subscription closed:', reason);
                    }
                }
            );

            function renderEvents() {
                if (receivedEvents.length === 0) {
                    eventsContainer.innerHTML = 'Keine Events gefunden.';
                    return;
                }

                // Sort events by creation date, newest first.
                receivedEvents.sort((a, b) => b.created_at - a.created_at);

                eventsContainer.innerHTML = ''; // Clear the "Lade Events..." message

                for (const event of receivedEvents) {
                    const eventDiv = document.createElement('div');
                    eventDiv.className = 'event';

                    const contentP = document.createElement('p');
                    contentP.textContent = event.content;

                    const time = new Date(event.created_at * 1000).toLocaleString('de-DE');
                    const timeSmall = document.createElement('small');
                    timeSmall.textContent = time;

                    eventDiv.appendChild(contentP);
                    eventDiv.appendChild(timeSmall);
                    eventsContainer.appendChild(eventDiv);
                }

                // Close the pool after we are done.
                // pool.close(relays) is not the correct way for SimplePool,
                // there is no global close for SimplePool, connections are managed internally.
                // The subscription closure is enough.
            }

        } catch (error) {
            console.error('Fehler beim Laden der Events:', error);
            eventsContainer.innerHTML = `Fehler: ${error.message}`;
        }
    });
});
