'use client';

import { useState, useEffect } from 'react';
import { GraphQLClient, gql } from 'graphql-request';

const endpoint = 'https://graphql.anilist.co';
const graphQLClient = new GraphQLClient(endpoint);

const query = gql`
  query {
    MediaListCollection(userName: "ArigatoGeek", type: ANIME, status: COMPLETED) {
      lists {
        entries {
          media {
            id
            idMal
            title {
              romaji
              english
            }
            coverImage {
              large
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
  }).filter(Boolean); // elimina posibles null
};

export default function HomePage() {
  const [animes, setAnimes] = useState([]);
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [characters, setCharacters] = useState([]);

  // Obtener los animes de AniList al montar el componente
  useEffect(() => {
    const fetchAnimes = async () => {
      const data = await graphQLClient.request(query);
      const animeList = data.MediaListCollection.lists[0].entries;
      setAnimes(animeList);
    };
    fetchAnimes();
  }, []);

  // Consultar personajes desde Jikan cuando se selecciona un anime
  useEffect(() => {
    const fetchCharacters = async () => {
      if (!selectedAnime) return;
      const res = await fetch(`https://api.jikan.moe/v4/anime/${selectedAnime.idMal}/characters`);
      const data = await res.json();

      const sorted = data.data.sort((a, b) => (a.favorites || 0) - (b.favorites || 0));
      const grouped = splitIntoChunks(sorted, 4);
      const randomCharacters = pickOneFromEachGroup(grouped);

      setCharacters(randomCharacters);
    };
    fetchCharacters();
  }, [selectedAnime]);

  return (
    <div>
      <h1>Animes completados de ArigatoGeek</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
        {animes.map(({ media }) => (
          <div
            key={media.id}
            style={{
              border: '1px solid #ccc',
              padding: '10px',
              cursor: 'pointer',
              width: '150px',
              textAlign: 'center',
            }}
            onClick={() => setSelectedAnime(media)}
          >
            <img src={media.coverImage.large} alt={media.title.romaji} width={100} />
            <p>{media.title.english || media.title.romaji}</p>
          </div>
        ))}
      </div>

      {selectedAnime && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Personajes aleatorios de: {selectedAnime.title.english || selectedAnime.title.romaji}</h2>
          <ul style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
            {characters.map((char) => (
              <li key={char.character.mal_id} style={{ listStyle: 'none', textAlign: 'center' }}>
                <img
                  src={char.character.images.webp.image_url}
                  alt={char.character.name}
                  width={80}
                />
                <p>{char.character.name}</p>
                <p>❤️ {char.favorites}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
