import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SalasService, Sala } from '../../core/services/salas.service';
import { AuthService } from '../../core/services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-salas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './salas.component.html',
  styleUrls: ['./salas.component.css']
})
export class SalasComponent implements OnInit {
  private salasService = inject(SalasService);
  private fb = inject(FormBuilder);
  authService = inject(AuthService);

  salas: Sala[] = [];
  salaForm: FormGroup;
  isModalVisible = false;
  isEditing = false;
  currentSalaId: number | null = null;

  constructor() {
    this.salaForm = this.fb.group({
      nombre: ['', Validators.required],
      capacidad: ['', [Validators.required, Validators.min(1)]],
      descripcion: [''],
      calendar_id: [''],
      color: ['#1e90ff'] // Valor por defecto
    });
  }

  ngOnInit(): void {
    this.loadSalas();
  }

  loadSalas(): void {
    this.salasService.getSalas().subscribe(data => {
      this.salas = data;
    });
  }

  openModal(sala?: Sala): void {
    this.isModalVisible = true;
    if (sala) {
      this.isEditing = true;
      this.currentSalaId = sala.id;
      this.salaForm.patchValue({
        ...sala,
        color: sala.color || '#1e90ff' // Asegurar un valor por defecto
      });
    } else {
      this.isEditing = false;
      this.currentSalaId = null;
      this.salaForm.reset({ color: '#1e90ff' }); // Reset con color por defecto
    }
  }

  closeModal(): void {
    this.isModalVisible = false;
  }

  onSubmit(): void {
    if (this.salaForm.invalid) {
      return;
    }

    const salaData = this.salaForm.value;

    if (this.isEditing && this.currentSalaId) {
      this.salasService.updateSala(this.currentSalaId, salaData).subscribe(() => {
        this.loadSalas();
        this.closeModal();
        Swal.fire('¡Actualizada!', 'La sala ha sido modificada.', 'success');
      });
    } else {
      this.salasService.createSala(salaData).subscribe(() => {
        this.loadSalas();
        this.closeModal();
        Swal.fire('¡Creada!', 'La nueva sala ha sido creada.', 'success');
      });
    }
  }

  onDelete(id: number): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: "Esta acción marcará la sala como inactiva.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, ¡desactívala!',
      cancelButtonText: 'No, cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.salasService.deleteSala(id).subscribe(() => {
          this.loadSalas();
          Swal.fire('¡Desactivada!', 'La sala ha sido desactivada.', 'success');
        });
      }
    });
  }
}
