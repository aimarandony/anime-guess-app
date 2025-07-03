'use client';

import { useEffect, useState } from 'react';
import { GraphQLClient, gql } from 'graphql-request';

const endpoint = 'https://graphql.anilist.co';
const graphQLClient = new GraphQLClient(endpoint);

const query = gql`
  query {
    MediaListCollection(userName: "ArigatoGeek", type: ANIME, status: COMPLETED) {
      lists {
        name
        entries {
          id
          media {
            id
            idMal
            title {
              romaji
              english
              native
            }
            coverImage {
              large
            }
            siteUrl
            format
            relations {
              nodes {
                id
                idMal
                title {
                  english
                  romaji
                }
              }
            }
          }
        }
      }
    }
  }
`;

const splitIntoChunks = (arr, chunkCount) => {
  const chunkSize = Math.ceil(arr.length / chunkCount);
  return Array.from({ length: chunkCount }, (_, i) =>
    arr.slice(i * chunkSize, (i + 1) * chunkSize)
  );
};

const pickOneFromEachGroup = (groups) => {
  return groups.map(group => {
    if (group.length === 0) return null;
    const index = Math.floor(Math.random() * group.length);
    return group[index];
  }).filter(Boolean);
};

export default function HomePage() {
  const [step, setStep] = useState('start'); // start | playing | finished
  const [animes, setAnimes] = useState([]);
  const [correctAnime, setCorrectAnime] = useState(null);
  const [correctAnimeNodos, setCorrectAnimeNodos] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAnswerCorrect, setSelectedAnswerCorrect] = useState(false);

  const filteredAnimes = animes.filter(({ media }) =>
    media.title.romaji.toLowerCase().includes(searchTerm.toLowerCase()) ||
    media.title.english?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  console.log('🎯 Animes filtrados:', filteredAnimes);

  // Obtener animes del usuario
  useEffect(() => {
    const fetchAnimes = async () => {
      const data = await graphQLClient.request(query);
      let animeList = data.MediaListCollection.lists[0].entries;

      const formatsAllowed = ["TV", "ONA"];
      animeList = animeList.filter(({ media }) => formatsAllowed.includes(media.format));
      
      setAnimes(animeList);
    };
    fetchAnimes();
  }, []);

  const handleStartGame = async () => {
    setStep('loading');
    setSearchTerm('');

    const random = animes[Math.floor(Math.random() * animes.length)];
    const animeRandom = random == null ? [] : random.media;
    setCorrectAnime(animeRandom);

    const nodesAnimeSelect = animeRandom.relations.nodes.map(node => node.id);
    setCorrectAnimeNodos(nodesAnimeSelect);

    console.log('ANIME RANDOM NODOS: ', nodesAnimeSelect);
    console.log('ANIME RANDOM: ', animeRandom);

    try {
      const res = await fetch(`https://api.jikan.moe/v4/anime/${random.media.idMal}/characters`);
      const data = await res.json();
      const sorted = data.data.sort((a, b) => (b.favorites || 0) - (a.favorites || 0));
      const grouped = splitIntoChunks(sorted, 4);
      const randomChars = pickOneFromEachGroup(grouped);
      setCharacters(randomChars);
      setStep('playing');
    } catch (error) {
      console.error('Error fetching characters', error);
      setStep('start');
    }
  };

  const handleAnswerSelect = (media) => {
    const nodesAnimeSelect = media.relations.nodes.map(node => node.id);
    const nodoMatch = correctAnimeNodos.some(id => nodesAnimeSelect.includes(id));
    console.log('ANIME IS CORRECT?', nodoMatch);

    console.log('ANIME SELECTED: ', media);
    console.log('ANIME SELECTED NODOS: ', nodesAnimeSelect);

    setSelectedAnswerCorrect(nodoMatch);
    setStep('finished');
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      {step === 'start' && (
        <div style={{ textAlign: 'center' }}>
          <h1>¿De qué anime son estos personajes?</h1>
          <button onClick={handleStartGame} style={{ padding: '0.75rem 1.5rem', marginTop: '1rem' }}>
            Iniciar Juego
          </button>
        </div>
      )}

      {step === 'loading' && (
        <div style={{ textAlign: 'center' }}>
          <p>Cargando personajes aleatorios...</p>
        </div>
      )}

      {step === 'playing' && (
        <>
          <h2>¿De qué anime son estos personajes?</h2>
          <ul style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', padding: 0 }}>
            {characters.map((char) => (
              <li key={char.character.mal_id} style={{ listStyle: 'none', textAlign: 'center' }}>
                <img src={char.character.images.webp.image_url} alt={char.character.name} width={100} />
                <p>{char.character.name}</p>
              </li>
            ))}
          </ul>

          <input
            type="text"
            placeholder="Buscar anime..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ marginTop: '1.5rem', padding: '0.5rem', width: '100%' }}
          />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem' }}>
            {filteredAnimes.map(({ media }) => (
              <div
                key={media.id}
                style={{
                  border: '1px solid #ccc',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  width: '150px',
                  textAlign: 'center',
                }}
                onClick={() => handleAnswerSelect(media)}
              >
                <img src={media.coverImage.large} alt={media.title.romaji} width={100} />
                <p>{media.title.english || media.title.romaji}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {step === 'finished' && (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <h2>
            {selectedAnswerCorrect
              ? '🎉 ¡Correcto!'
              : `❌ Incorrecto. Era: ${correctAnime.title.english || correctAnime.title.romaji}`}
          </h2>
          <button onClick={handleStartGame} style={{ marginTop: '1rem', padding: '0.75rem 1.5rem' }}>
            Jugar otra vez
          </button>
        </div>
      )}
    </div>
  );
}
