export interface UrbanTree {
  id: number;
  lat: number;
  lng: number;
  species: string;
  commonName: string | null;
  genus: string | null;
  condition: string | null;
  dbh: number | null;
  ward: string | null;
}
