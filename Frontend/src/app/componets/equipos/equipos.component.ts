import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EquiposService, Equipo } from '../../core/services/equipos.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-equipos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './equipos.component.html'
})
export class EquiposComponent implements OnInit {
  private equiposService = inject(EquiposService);
  private fb = inject(FormBuilder);

  equipos: Equipo[] = [];
  equipoForm: FormGroup;
  isModalVisible = false;
  isEditing = false;
  currentEquipoId: number | null = null;

  constructor() {
    this.equipoForm = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: [''],
      disponible: [true]
    });
  }

  ngOnInit(): void {
    this.loadEquipos();
  }

  loadEquipos(): void {
    this.equiposService.getEquipos().subscribe(data => {
      this.equipos = data;
    });
  }

  openModal(equipo?: Equipo): void {
    this.isModalVisible = true;
    if (equipo) {
      this.isEditing = true;
      this.currentEquipoId = equipo.id;
      this.equipoForm.patchValue(equipo);
    } else {
      this.isEditing = false;
      this.currentEquipoId = null;
      this.equipoForm.reset({ disponible: true });
    }
  }

  closeModal(): void {
    this.isModalVisible = false;
  }

  onSubmit(): void {
    if (this.equipoForm.invalid) return;

    const equipoData = this.equipoForm.value;
    const action = this.isEditing 
      ? this.equiposService.updateEquipo(this.currentEquipoId!, equipoData)
      : this.equiposService.createEquipo(equipoData);

    action.subscribe(() => {
      this.loadEquipos();
      this.closeModal();
      Swal.fire({
        title: this.isEditing ? '¡Actualizado!' : '¡Creado!',
        text: `El equipo ha sido ${this.isEditing ? 'actualizado' : 'creado'} exitosamente.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    });
  }

  onDelete(id: number): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: "Esta acción no se puede deshacer.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, ¡elimínalo!',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.equiposService.deleteEquipo(id).subscribe(() => {
          this.loadEquipos();
          Swal.fire(
            '¡Eliminado!',
            'El equipo ha sido eliminado.',
            'success'
          );
        });
      }
    });
  }
}
