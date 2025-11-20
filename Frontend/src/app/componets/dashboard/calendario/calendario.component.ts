import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { CalendarModule, CalendarView, CalendarEvent } from 'angular-calendar';
import { startOfDay, endOfDay, isSameMonth, isSameDay, addMinutes, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { Subject, Observable, Subscription } from 'rxjs';
import { map, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators'; // Agregamos takeUntil
import { HttpErrorResponse } from '@angular/common/http';

import { ReservasService, Reserva } from '../../../core/services/reservas.service';
import { SalasService, Sala } from '../../../core/services/salas.service';
import { DirectorioService, Contacto } from '../../../core/services/directorio.service';
import { EquiposService, Equipo } from '../../../core/services/equipos.service';
import { AuthService } from '../../../core/services/auth.service';

import Swal from 'sweetalert2';

@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [CommonModule, CalendarModule, FormsModule, ReactiveFormsModule],
  templateUrl: './calendario.component.html',
  styleUrls: ['./calendario.component.css']
})
export class CalendarioComponent implements OnInit, OnDestroy {
  private reservasService = inject(ReservasService);
  private salasService = inject(SalasService);
  private directorioService = inject(DirectorioService);
  private equiposService = inject(EquiposService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  view: CalendarView = CalendarView.Month;
  CalendarView = CalendarView;
  viewDate: Date = new Date();
  allEvents: CalendarEvent[] = [];
  filteredEvents: CalendarEvent[] = [];
  selectedSalaId: number | null = null;
  refresh = new Subject<void>();
  
  // Subject para cancelar suscripciones al destruir el componente
  private destroy$ = new Subject<void>(); 

  isModalVisible = false;
  editingReservaId: number | null = null;
  reservaForm: FormGroup;
  salas: Sala[] = [];
  equipos: Equipo[] = [];

  searchSuggestions$!: Observable<Contacto[]>;
  private searchTerms = new Subject<string>();
  invitados: Contacto[] = [];

  constructor() {
    this.reservaForm = this.fb.group({
      sala_id: [null, Validators.required],
      titulo: ['', Validators.required],
      fecha_inicio: ['', Validators.required],
      fecha_fin: ['', Validators.required],
      descripcion: [''],
      invitadoSearch: [''],
      equipos: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.loadReservas();
    this.loadSalas();
    this.loadEquipos();

    this.searchSuggestions$ = this.searchTerms.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((term: string) => this.directorioService.search(term))
    );

    // --- MEJORA DE UX: Sincronizar Fechas ---
    // Cada vez que cambia 'fecha_inicio', calculamos 'fecha_fin' + 1 hora
    this.reservaForm.get('fecha_inicio')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((inicioValue) => {
        if (inicioValue) {
          // Crear fecha basada en el input (que es texto local)
          const startDate = new Date(inicioValue);
          
          // Sumar 60 minutos (1 hora)
          const endDate = addMinutes(startDate, 60);
          
          // Formatear para el input html
          const formattedEnd = this.formatToLocalDateTime(endDate);
          
          // Actualizar fecha_fin sin disparar eventos (para evitar loops si tuvieras lógica inversa)
          // Solo lo hacemos si NO estamos en modo edición cargando datos iniciales (lo manejamos con cuidado en openModal)
          this.reservaForm.get('fecha_fin')?.setValue(formattedEnd);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get equiposFormArray() {
    return this.reservaForm.controls['equipos'] as FormArray;
  }

  search(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.searchTerms.next(term);
  }

  addInvitado(contacto: Contacto): void {
    if (!this.invitados.find(i => i.email === contacto.email)) {
      this.invitados.push(contacto);
    }
    this.reservaForm.get('invitadoSearch')?.setValue('');
    this.searchTerms.next('');
  }

  removeInvitado(contacto: Contacto): void {
    this.invitados = this.invitados.filter(i => i.email !== contacto.email);
  }

  loadEquipos(): void {
    this.equiposService.getEquipos().subscribe((data: Equipo[]) => {
      this.equipos = data;
      this.equiposFormArray.clear();
      this.equipos.forEach(() => this.equiposFormArray.push(this.fb.control(false)));
    });
  }

  loadReservas(): void {
    let start: Date;
    let end: Date;

    switch (this.view) {
      case CalendarView.Month:
        start = startOfMonth(this.viewDate);
        end = endOfMonth(this.viewDate);
        break;
      case CalendarView.Week:
        start = startOfWeek(this.viewDate);
        end = endOfWeek(this.viewDate);
        break;
      case CalendarView.Day:
      default:
        start = startOfDay(this.viewDate);
        end = endOfDay(this.viewDate);
        break;
    }

    this.reservasService.getReservas(start, end)
      .pipe(
        map((reservas: Reserva[]): CalendarEvent[] => {
          // 1. Obtenemos el usuario actual UNA sola vez
          const currentUser = this.authService.currentUser();

          return reservas.map((reserva: Reserva) => {
            const colorPrimario = reserva.sala_color || '#1e90ff';

            //Detectar si hay equipos
            // (Aseguramos que sea un array o string no vacío)
            const equiposAny = reserva.equipos as any;
            const hasEquipos = (Array.isArray(equiposAny) && equiposAny.length > 0) || (typeof equiposAny === 'string' && equiposAny.length > 0);

            // 2. Definir el icono visual
            const equipoIcon = hasEquipos ? '💻 ' : '';

            // 2.  LÓGICA DE PRIVACIDAD y idicador de quipos
            const isOwner = currentUser?.id === reserva.usuario_id;
            // Verificamos si el email del usuario está en la lista de invitados
            // Usamos ?. y || '' por seguridad si invitados viene null
            const isInvited = reserva.invitados?.includes(currentUser?.email || '');
            const isAdmin = currentUser?.roles?.includes('admin'); // Opcional: si el admin debe ver todo

            let displayTitle = '';

            // Si es el dueño, está invitado o es admin -> Ve el título real
            if (isOwner || isInvited || isAdmin) {
                displayTitle = `${equipoIcon}${reserva.titulo} (${reserva.sala_nombre})`;
            } else {
                // Si es un tercero -> Ve "Ocupado"
                displayTitle = `${equipoIcon}Ocupado (${reserva.sala_nombre})`;
            }
            

            // Conversión explícita para asegurar que el calendario lo pinte bien
            return {
              id: reserva.id,
              start: new Date(reserva.fecha_inicio),
              end: new Date(reserva.fecha_fin),
              title: displayTitle,
              color: { 
                primary: colorPrimario, 
                secondary: this.hexToRgba(colorPrimario, 0.3),
                secondaryText: '#111'
              },
              meta: { reserva: reserva },
            };
          });
        })
      )
      .subscribe((calendarEvents: CalendarEvent[]) => {
        this.allEvents = calendarEvents;
        this.applyFilter();
        this.refresh.next();
      });
  }
  
  loadSalas(): void {
    this.salasService.getSalas().subscribe((data: Sala[]) => {
      this.salas = data;
    });
  }

  dayClicked({ date, events }: { date: Date; events: CalendarEvent[] }): void {
    if (isSameMonth(date, this.viewDate)) {
      if ((isSameDay(this.viewDate, date) && this.view !== CalendarView.Day) || events.length === 0) {
        this.viewDate = date;
        this.view = CalendarView.Day;
      }
    }
  }

  // --- CORRECCIÓN 3: Formateador Robusto para Inputs ---
  private formatToLocalDateTime(date: Date): string {
    const d = new Date(date);
    // IMPORTANTE: Usamos getFullYear/getMonth/etc locales, NO getUTC...
    // Queremos que el input muestre la hora "del reloj del usuario"
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  openModal(date?: Date, reserva?: Reserva): void {
    this.reservaForm.reset();
    this.invitados = [];
    this.editingReservaId = null;
    this.equiposFormArray.reset(this.equipos.map(() => false));

    if (reserva) {
      // MODO EDICIÓN
      this.editingReservaId = reserva.id;

      const equipoValues = this.equipos.map(equipo => 
        reserva.equipos?.includes(equipo.nombre) || false
      );
      
      // PatchValue con emitEvent: false para que NO se dispare el cálculo automático de hora fin
      // y respete la hora de fin real que viene de la base de datos.
      this.reservaForm.patchValue({
        ...reserva,
        fecha_inicio: this.formatToLocalDateTime(new Date(reserva.fecha_inicio)),
        fecha_fin: this.formatToLocalDateTime(new Date(reserva.fecha_fin)),
        equipos: equipoValues
      }, { emitEvent: false });

      if (reserva.invitados && reserva.invitados.length > 0) {
        this.directorioService.getContactosByEmails(reserva.invitados).subscribe((contactos: Contacto[]) => {
            this.invitados = contactos;
        });
      }

    } else {
      // MODO CREACIÓN
      const startDate = date || new Date();
      // Redondear minutos para que se vea bonito (opcional, ej: 10:00 en vez de 10:14)
      startDate.setSeconds(0, 0);
      
      const endDate = addMinutes(startDate, 60);

      this.reservaForm.patchValue({
        fecha_inicio: this.formatToLocalDateTime(startDate),
        fecha_fin: this.formatToLocalDateTime(endDate)
      }, { emitEvent: false }); // También evitamos disparo innecesario al abrir
    }

    this.isModalVisible = true;
  }

  closeModal(): void {
    this.isModalVisible = false;
  }

  // --- CORRECCIÓN 2: Envío de Fechas Correctas (ISO/UTC) ---
  onSubmit(): void {
    if (this.reservaForm.invalid) return;

    const formValue = this.reservaForm.value;
    
    // 1. Convertir Strings del Input a Objetos Date (Hora Local)
    const fechaInicioDate = new Date(formValue.fecha_inicio);
    const fechaFinDate = new Date(formValue.fecha_fin);

    // 2. Convertir a ISO String (UTC) para el Backend
    // Esto soluciona el problema de las horas que se movían.
    const fechaInicioISO = fechaInicioDate.toISOString();
    const fechaFinISO = fechaFinDate.toISOString();

    const invitadosEmails = this.invitados.map(i => i.email);
    
    const currentUserEmail = this.authService.currentUser()?.email;
    if (currentUserEmail && !invitadosEmails.includes(currentUserEmail)) {
      invitadosEmails.push(currentUserEmail);
    }

    const selectedEquipoIds = this.reservaForm.value.equipos
      .map((checked: boolean, i: number) => checked ? this.equipos[i].id : null)
      .filter((id: number | null): id is number => id !== null);

    const reservaData = {
      ...formValue,
      fecha_inicio: fechaInicioISO, // Enviamos la ISO
      fecha_fin: fechaFinISO,       // Enviamos la ISO
      invitados: invitadosEmails,
      equipos: selectedEquipoIds
    };

    // Validación extra de seguridad frontend
    if (fechaFinDate <= fechaInicioDate) {
      Swal.fire('Horario inválido', 'La hora de fin debe ser posterior a la de inicio.', 'warning');
      return;
    }

    if (this.editingReservaId) {
      this.reservasService.updateReserva(this.editingReservaId, reservaData).subscribe({
        next: () => {
          this.loadReservas();
          this.closeModal();
          Swal.fire('¡Actualizado!', 'La reunión ha sido modificada.', 'success');
        },
        error: (err: HttpErrorResponse) => {
          Swal.fire('Error', err.error.message || 'No se pudo actualizar la reserva.', 'error');
        }
      });
    } else {
      this.reservasService.createReserva(reservaData).subscribe({
        next: (response: any) => {
          this.loadReservas();
          this.closeModal();
          const successMsg = response.status === 202 
            ? { title: 'Solicitud Enviada', text: 'El horario está ocupado. Solicitud enviada.', icon: 'info' as const }
            : { title: '¡Reservado!', text: 'Tu reunión ha sido agendada.', icon: 'success' as const };
          Swal.fire(successMsg);
        },
        error: (err: HttpErrorResponse) => {
          Swal.fire('Error', err.error.message || 'No se pudo crear la reserva.', 'error');
        }
      });
    }
  }

  setView(view: CalendarView) {
    this.view = view;
  }

  handleEventClick(event: CalendarEvent<{ reserva: Reserva }>): void {
    if (!event.meta?.reserva) {
      return;
    }
    const reserva = event.meta.reserva;
    const currentUser = this.authService.currentUser();
    const isOwner = currentUser?.id === reserva.usuario_id;

    if (isOwner) {
      Swal.fire({
        title: reserva.titulo,
        text: '¿Qué deseas hacer con tu reserva?',
        showConfirmButton: true,
        confirmButtonText: 'Editar',
        showDenyButton: true,
        denyButtonText: 'Cancelar Reserva',
        showCancelButton: true,
        cancelButtonText: 'Ver Detalles',
      }).then((result) => {
        if (result.isConfirmed) {
          this.editReserva(reserva);
        } else if (result.isDenied) {
          this.cancelarReserva(reserva.id);
        } else if (result.dismiss === Swal.DismissReason.cancel) {
          this.showReservaDetails(reserva);
        }
      });
    } else {
      this.showReservaDetails(reserva);
    }
  }

  private showReservaDetails(reserva: Reserva): void {
    const currentUser = this.authService.currentUser();
    const isOwner = currentUser?.id === reserva.usuario_id;
    const isInvited = reserva.invitados?.includes(currentUser?.email || '');
    const isAdmin = currentUser?.roles?.includes('admin');

    let displayTitle = '';
    let detailsHtml = '';

    if (isOwner || isInvited || isAdmin) {
      displayTitle = `${reserva.titulo} (${reserva.sala_nombre})`;
      const invitadosHtml = reserva.invitados && reserva.invitados.length > 0
        ? `<ul>${reserva.invitados.map((email: string) => `<li>${email}</li>`).join('')}</ul>`
        : '<p>No hay invitados adicionales.</p>';

      const equipoHtml = reserva.equipos && reserva.equipos.length > 0
        ? `<ul>${reserva.equipos.map((equipo: string) => `<li>${equipo}</li>`).join('')}</ul>`
        : '<p>No se solicitó equipo.</p>';

      detailsHtml = `
        <hr>
        <p><strong>Descripción:</strong> ${reserva.descripcion || 'N/A'}</p>
        <p><strong>Invitados:</strong></p>
        ${invitadosHtml}
        <p><strong>Equipamiento Solicitado:</strong></p>
        ${equipoHtml}
      `;
    } else {
      displayTitle = `Ocupado (${reserva.sala_nombre})`;
      detailsHtml = `
        <hr>
        <p><i>No tienes permiso para ver los detalles de esta reunión.</i></p>
      `;
    }

    Swal.fire({
      title: displayTitle,
      html: `
        <div style="text-align: left; padding: 0 1rem;">
          <p><strong>Sala:</strong> ${reserva.sala_nombre}</p>
          <p><strong>Reservado por:</strong> ${reserva.usuario_nombre}</p>
          <p><strong>Horario:</strong> ${new Date(reserva.fecha_inicio).toLocaleString()} - ${new Date(reserva.fecha_fin).toLocaleString()}</p>
          ${detailsHtml}
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Unirse a Meet',
      cancelButtonText: 'Cerrar',
    }).then((result) => {
      if (result.isConfirmed) {
        if (isOwner || isInvited) {
          window.open(reserva.meet_link, '_blank');
        } else {
          Swal.fire('Acceso denegado', 'No estás invitado a esta reunión.', 'info');
        }
      }
    });
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  cancelarReserva(reservaId: number): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: "Esta acción cancelará la reserva y el evento en Google Calendar.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'No'
    }).then((result) => {
      if (result.isConfirmed) {
        this.reservasService.deleteReserva(reservaId).subscribe({
          next: () => {
            this.loadReservas();
            Swal.fire('¡Cancelada!', 'La reserva ha sido cancelada.', 'success');
          },
          error: (err) => {
            Swal.fire('Error', err.error.message || 'No se pudo cancelar la reserva.', 'error');
          }
        });
      }
    });
  }

  async editReserva(reserva: Reserva): Promise<void> {
    this.openModal(undefined, reserva);
  }

  onSalaFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const salaId = target.value ? Number(target.value) : null;
    this.selectedSalaId = salaId;
    this.applyFilter();
  }

  private applyFilter(): void {
    if (!this.selectedSalaId) {
      this.filteredEvents = [...this.allEvents];
    } else {
      this.filteredEvents = this.allEvents.filter(event => 
        event.meta.reserva.sala_id === this.selectedSalaId
      );
    }
    this.refresh.next();
  }
}