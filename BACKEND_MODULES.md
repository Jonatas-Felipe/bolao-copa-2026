# Arquitetura do Backend para o Bolão da Copa (Node.js/Express)

Para criar o backend que alimenta a API deste aplicativo, você deve seguir um modelo RESTful, preferencialmente utilizando **Node.js** com **Express**. Use **TypeORM** com um banco de dados relacional como PostgreSQL.

## 1. Módulos / Entidades Principais

Você precisará de 3 domínios principais:
- **Users (Usuários):** Autenticação e informações (nome e PIN seguro/hash).
- **Matches (Jogos):** Sincronização com a [API-Football](https://www.api-football.com/).
- **Guesses (Palpites):** Relação entre um usuário e um jogo, armazenando o placar.

---

## 2. Modelagem do Banco de Dados (Entidades TypeORM)

```typescript
// src/entities/User.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
import { Guess } from './Guess';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column()
  pin: string; // bcrypt hash

  @Column({ default: 0 })
  points: number; // Pontuação pré-calculada do ranking

  @OneToMany(() => Guess, (guess) => guess.user)
  guesses: Guess[];

  @CreateDateColumn()
  createdAt: Date;
}

// src/entities/Match.ts
import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { Guess } from './Guess';

@Entity()
export class Match {
  @PrimaryColumn()
  id: string; // ID que vem da API-Football

  @Column()
  homeTeam: string;

  @Column()
  awayTeam: string;

  @Column()
  homeFlag: string;

  @Column()
  awayFlag: string;

  @Column({ type: 'timestamp' })
  date: Date;

  @Column()
  status: string; // 'SCHEDULED', 'IN_PLAY', 'FINISHED'

  @Column({ type: 'int', nullable: true })
  homeScore: number | null;

  @Column({ type: 'int', nullable: true })
  awayScore: number | null;

  @OneToMany(() => Guess, (guess) => guess.match)
  guesses: Guess[];
}

// src/entities/Guess.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { User } from './User';
import { Match } from './Match';

@Entity()
@Unique(['userId', 'matchId']) // Um usuário só pode ter um palpite por jogo
export class Guess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  homeScore: number;

  @Column({ type: 'int' })
  awayScore: number;

  @Column()
  userId: string;

  @Column()
  matchId: string;

  @ManyToOne(() => User, (user) => user.guesses)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Match, (match) => match.guesses)
  @JoinColumn({ name: 'matchId' })
  match: Match;
}
```

---

## 3. Principais Endpoints da API

### Módulo de Auth (Usuários)
- `POST /api/auth/register` - Recebe `{ name, pin }`. Verifica se o nome existe. Faz o hash do PIN e salva o usuário.
- `POST /api/auth/login` - Recebe `{ name, pin }`. Compara o hash. Retorna um JWT (JSON Web Token).

### Módulo de Jogos (Matches)
- `GET /api/matches` - Retorna a lista de jogos do banco de dados (já importados da API-Football).
- `POST /api/matches/sync` (Admin/Cronjob) - Chama a API-Football e atualiza a tabela `Match` no seu DB. Se um jogo mudar para 'FINISHED', aciona um Worker/Serviço interno para recalcular os pontos (Ranking).

### Módulo de Palpites (Guesses)
- `POST /api/guesses` - Recebe `{ matchId, homeScore, awayScore }`. **Regra de Negócio (CRÍTICA!):** No backend, sempre verifique se a data do `Match` correspondente ao `matchId` está marcando no mínimo 30 minutos no futuro (`match.date > now + 30min`). Se for menor, rejeite com `403 Forbidden`. Retorne um status de falha de "Tempo esgotado".
- `GET /api/guesses/me` - Retorna a lista de palpites do usuário logado (via auth middleware do JWT).

### Módulo de Ranking
- `GET /api/ranking` - Retorna os usuários ordenados pela coluna `points` (`SELECT id, name, points FROM User ORDER BY points DESC`).

---

## 4. O Sistema de Pontuação (Worker/Serviço)
Após a sincronização dos placares finais com a API-Football (`status === 'FINISHED'`), você precisará de uma função que compare as apostas. 

```javascript
// Exemplo Lógico em Node (Calculadora de Pontos):
function calculatePoints(guess, match) {
  if (guess.homeScore === match.homeScore && guess.awayScore === match.awayScore) {
    return 5; // Placar exato
  }
  
  const guessDiff = guess.homeScore - guess.awayScore;
  const matchDiff = match.homeScore - match.awayScore;
  
  if (guessDiff === 0 && matchDiff === 0) {
    return 3; // Acertou empate (mas não exato)
  }
  
  // Condição: Acertou o vencedor
  const guessWinner = guessDiff > 0 ? 'home' : (guessDiff < 0 ? 'away' : 'draw');
  const matchWinner = matchDiff > 0 ? 'home' : (matchDiff < 0 ? 'away' : 'draw');

  if (guessWinner === matchWinner) {
    if (guess.homeScore === match.homeScore || guess.awayScore === match.awayScore) {
      return 2; // Vencedor + 1 placar de time correto
    }
    return 1; // Só vencedor correto
  }
  
  return 0;
}
```

---

## 5. Integração com a API-Football (v3)

A Copa do Mundo 2026 (FIFA World Cup) deve ser acessada via [API-Football v3](https://www.api-football.com/) hospedada no RapidAPI. A chave de API **nunca** deve ser exposta no frontend.

### 5.1. Configuração

```env
# .env do backend
API_FOOTBALL_KEY=sua_chave_aqui
API_FOOTBALL_HOST=v3.football.api-sports.io
API_FOOTBALL_BASE_URL=https://v3.football.api-sports.io
```

### 5.2. Identificadores Importantes

| Recurso | ID na API-Football |
|---------|-------------------|
| Copa do Mundo 2026 (league) | `1` (FIFA World Cup) |
| Temporada (season) | `2026` |

> **Nota:** Confirmar o `league id` exato ao se cadastrar na API. O ID `1` é historicamente usado para a World Cup, mas convém validar com `GET /leagues?name=World Cup&type=cup`.

### 5.3. Endpoints da API-Football a Consumir

#### Buscar todos os jogos da Copa 2026
```
GET /fixtures?league=1&season=2026
Header: x-apisports-key: {API_FOOTBALL_KEY}
```

#### Buscar jogos por data (para sync diário)
```
GET /fixtures?league=1&season=2026&date=2026-06-11
```

#### Buscar jogos ao vivo (para atualizar status em tempo real)
```
GET /fixtures?league=1&season=2026&live=all
```

#### Buscar detalhes de um jogo específico
```
GET /fixtures?id={fixture_id}
```

### 5.4. Mapeamento de Resposta da API → Model `Match`

```typescript
// Resposta da API-Football (simplificada)
interface APIFootballFixture {
  fixture: {
    id: number;           // → Match.id (converter para string)
    date: string;         // → Match.date (ISO 8601)
    status: {
      short: string;      // 'NS' | '1H' | 'HT' | '2H' | 'FT' | 'AET' | 'PEN' | etc.
    };
  };
  teams: {
    home: { name: string; logo: string };  // → Match.homeTeam
    away: { name: string; logo: string };  // → Match.awayTeam
  };
  goals: {
    home: number | null;  // → Match.homeScore
    away: number | null;  // → Match.awayScore
  };
}

// Mapeamento de status
function mapStatus(apiStatus: string): 'SCHEDULED' | 'IN_PLAY' | 'FINISHED' {
  switch (apiStatus) {
    case 'NS':   // Not Started
    case 'TBD':  // Time To Be Defined
    case 'PST':  // Postponed
      return 'SCHEDULED';
    case '1H':   // First Half
    case '2H':   // Second Half
    case 'HT':   // Half Time
    case 'ET':   // Extra Time
    case 'P':    // Penalty In Progress
    case 'LIVE': 
      return 'IN_PLAY';
    case 'FT':   // Full Time
    case 'AET':  // After Extra Time
    case 'PEN':  // Penalty Shootout (ended)
    case 'AWD':  // Awarded
    case 'WO':   // Walkover
      return 'FINISHED';
    default:
      return 'SCHEDULED';
  }
}
```

### 5.5. Mapeamento de Bandeiras (Flags)

A API-Football retorna logos dos times, mas para seleções nacionais usamos emoji flags. Manter um dicionário no backend:

```typescript
const countryFlags: Record<string, string> = {
  'Brazil': '🇧🇷',
  'Argentina': '🇦🇷',
  'France': '🇫🇷',
  'Germany': '🇩🇪',
  'Spain': '🇪🇸',
  'Portugal': '🇵🇹',
  'England': '🇬🇧',
  'Mexico': '🇲🇽',
  'USA': '🇺🇸',
  'Canada': '🇨🇦',
  'Switzerland': '🇨🇭',
  'Netherlands': '🇳🇱',
  'Belgium': '🇧🇪',
  'Croatia': '🇭🇷',
  'Uruguay': '🇺🇾',
  'Colombia': '🇨🇴',
  'Japan': '🇯🇵',
  'South Korea': '🇰🇷',
  'Australia': '🇦🇺',
  'Saudi Arabia': '🇸🇦',
  'Morocco': '🇲🇦',
  'Senegal': '🇸🇳',
  'Ghana': '🇬🇭',
  'Cameroon': '🇨🇲',
  'Nigeria': '🇳🇬',
  'Tunisia': '🇹🇳',
  'Iran': '🇮🇷',
  'Qatar': '🇶🇦',
  'Ecuador': '🇪🇨',
  'Chile': '🇨🇱',
  'Peru': '🇵🇪',
  'Serbia': '🇷🇸',
  'Poland': '🇵🇱',
  'Denmark': '🇩🇰',
  'Sweden': '🇸🇪',
  'Italy': '🇮🇹',
  // ... adicionar todas as 48 seleções classificadas
};
```

### 5.6. Serviço de Sincronização (`MatchSyncService`)

```typescript
// src/services/matchSync.service.ts
import axios from 'axios';
import { AppDataSource } from '../data-source';
import { Match } from '../entities/Match';
import { Guess } from '../entities/Guess';
import { User } from '../entities/User';

const matchRepo = AppDataSource.getRepository(Match);
const guessRepo = AppDataSource.getRepository(Guess);
const userRepo = AppDataSource.getRepository(User);

const apiFootball = axios.create({
  baseURL: process.env.API_FOOTBALL_BASE_URL,
  headers: {
    'x-apisports-key': process.env.API_FOOTBALL_KEY!,
  },
});

export async function syncMatches(): Promise<{ created: number; updated: number }> {
  const { data } = await apiFootball.get('/fixtures', {
    params: { league: 1, season: 2026 },
  });

  let created = 0;
  let updated = 0;

  for (const item of data.response) {
    const matchData: Partial<Match> = {
      id: String(item.fixture.id),
      homeTeam: item.teams.home.name,
      awayTeam: item.teams.away.name,
      homeFlag: countryFlags[item.teams.home.name] || '🏳️',
      awayFlag: countryFlags[item.teams.away.name] || '🏳️',
      date: new Date(item.fixture.date),
      status: mapStatus(item.fixture.status.short),
      homeScore: item.goals.home,
      awayScore: item.goals.away,
    };

    const existing = await matchRepo.findOneBy({ id: matchData.id });

    if (!existing) {
      await matchRepo.save(matchRepo.create(matchData));
      created++;
    } else {
      const wasNotFinished = existing.status !== 'FINISHED';
      await matchRepo.update(matchData.id!, matchData);
      updated++;

      // Se o jogo acabou de finalizar → recalcular pontos
      if (wasNotFinished && matchData.status === 'FINISHED') {
        await recalculatePointsForMatch(matchData.id!);
      }
    }
  }

  return { created, updated };
}

async function recalculatePointsForMatch(matchId: string): Promise<void> {
  const match = await matchRepo.findOneBy({ id: matchId });
  if (!match || match.homeScore === null || match.awayScore === null) return;

  const guesses = await guessRepo.find({ where: { matchId } });

  for (const guess of guesses) {
    const points = calculatePoints(guess, match);
    await userRepo.increment({ id: guess.userId }, 'points', points);
  }
}
```

### 5.7. Estratégia de Agendamento (Cron Jobs)

| Frequência | Tarefa | Descrição |
|------------|--------|-----------|
| 1x ao dia (06:00) | `syncMatches()` | Importa novos jogos e atualiza datas/horários |
| A cada 2 min (dias de jogo) | `syncLiveMatches()` | Atualiza placar de jogos ao vivo (`live=all`) |
| Após `FINISHED` detectado | `recalculatePoints()` | Recalcula ranking automaticamente |

```typescript
// Usar node-cron ou similar
import cron from 'node-cron';

// Sync geral diário às 06:00
cron.schedule('0 6 * * *', () => syncMatches());

// Sync de jogos ao vivo a cada 2 minutos (apenas em dias de jogo)
cron.schedule('*/2 * * * *', () => syncLiveMatches());
```

### 5.8. Limites da API-Football (Plano Free)

| Limite | Valor |
|--------|-------|
| Requisições/dia | 100 |
| Requisições/minuto | 30 |

**Estratégia para não estourar cota:**
- Cachear respostas no banco (nunca chamar a API direto do endpoint `GET /api/matches`)
- Sync a cada 2min apenas quando há jogos ao vivo (verificar no DB se algum match está `IN_PLAY`)
- Fora de dias de jogo, uma sync diária basta
- Considerar upgrade para plano pago (~$20/mês) durante a Copa se necessário

### 5.9. Variáveis de Ambiente Necessárias

```env
# Banco de Dados
DATABASE_URL=postgresql://user:pass@localhost:5432/bolao_copa_2026

# JWT
JWT_SECRET=uma_chave_secreta_forte_aqui

# API-Football
API_FOOTBALL_KEY=sua_chave_rapidapi_ou_api_sports
API_FOOTBALL_HOST=v3.football.api-sports.io
API_FOOTBALL_BASE_URL=https://v3.football.api-sports.io

# App
PORT=3001
NODE_ENV=development
```

### 5.10. Checklist de Implementação

- [ ] Criar projeto backend (`express` + `typescript` + `typeorm`)
- [ ] Configurar variáveis de ambiente (`.env` + `.env.example`)
- [ ] Criar entidades TypeORM e rodar migrations
- [ ] Implementar módulo de Auth (register/login com JWT)
- [ ] Implementar `MatchSyncService` com chamada à API-Football
- [ ] Criar dicionário de bandeiras (emoji flags por país)
- [ ] Implementar endpoint `GET /api/matches` (leitura do DB)
- [ ] Implementar endpoint `POST /api/matches/sync` (trigger manual)
- [ ] Implementar cron jobs para sync automático
- [ ] Implementar endpoint `POST /api/guesses` com validação de 30min
- [ ] Implementar endpoint `GET /api/guesses/me`
- [ ] Implementar endpoint `GET /api/ranking`
- [ ] Implementar `calculatePoints()` e recálculo automático
- [ ] Adicionar rate limiting e tratamento de erros da API-Football
- [ ] Testar fluxo completo: sync → palpite → finalização → ranking
