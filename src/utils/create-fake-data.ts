import { Contact } from "../types/contact";

export function createFakeData(): Contact[] {
    return [
        { id: '3f8a1c2e-5b7d-4e91-9a2f-1c4b8d6e0a13', name: 'Ana Silva', email: 'ana.silva@email.com', phone: '(11) 98765-4321' },
        { id: '7b4d9e11-2c6a-4f83-b5d7-9e1a3c7f2b48', name: 'Bruno Santos', email: 'bruno.santos@email.com', phone: '(21) 99876-5432' },
        { id: 'c1e5a973-8d4b-4a26-8f19-6b2d5e9c4a71', name: 'Carla Oliveira', email: 'carla.oliveira@email.com', phone: '(31) 97654-3210' },
        { id: '9d2f6b48-1a3c-4d57-a8e2-4f7b1c9d3e60', name: 'Diego Ferreira', email: 'diego.ferreira@email.com' },
        { id: '5a7c3e91-6b2d-4f18-9c4a-7e1b8d2f5c93', name: 'Elena Costa', email: 'elena.costa@email.com', phone: '(41) 96543-2109' },
    ]
}