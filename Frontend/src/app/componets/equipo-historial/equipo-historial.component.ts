import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EquiposService, HistorialEquipo } from '../../core/services/equipos.service';

@Component({
  selector: 'app-equipo-historial',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './equipo-historial.component.html',
  styleUrls: ['./equipo-historial.component.css']
})
export class EquipoHistorialComponent implements OnInit {
  private equiposService = inject(EquiposService);
  historial: HistorialEquipo[] = [];

  ngOnInit(): void {
    this.equiposService.getHistorial().subscribe(data => {
      this.historial = data;
    });
  }
}